import os
import re
import time
from pathlib import Path
from typing import TypedDict

from pydantic import BaseModel, Field, ValidationError

from core.sockets.types import SimpleResponse

from . import instructor_client, sio

# Use absolute path to avoid relative path issues
base_dir = Path(__file__).parent.parent.parent.parent
frontend_src_dir = base_dir / "frontend" / "src"


class AddRouteRequest(BaseModel):
    path: str
    component_name: str
    file_path: str  # e.g., "pages/MyComponent.tsx"


class WriteTsxRequest(BaseModel):
    file_path: str  # e.g., "components/MyComponent.tsx"
    code: str  # The entire TSX code content


class WriteAndRouteRequest(WriteTsxRequest, AddRouteRequest):
    pass


class Result(TypedDict):
    success: bool
    message: str


class GeneratedCode(BaseModel):
    code: str


async def construct_write_and_add_route_request(
    request: GeneratedCode,
) -> WriteAndRouteRequest:
    class NameAndPath(BaseModel):
        component_name: str = Field(
            description="The name of the component, this is the default exported component name. It is just the component name no tsx suffix. Example: TestComponent"
        )
        file_path: str = Field(
            description="the location the component will be in. THis is always inside pages folder, so pages/{component_name}.tsx . Example: pages/TestComponent.tsx"
        )
        path: str = Field(
            description="the path that the route will point to. This always starts with a / and is the path that the route will point to. Example: /test-component. This is inspired by the component name but can be simpler. THis is the path in the url. "
        )

    name_and_path = await instructor_client.chat.completions.create(
        model="o4-mini",
        response_model=NameAndPath,
        messages=[
            {
                "role": "user",
                "content": f"""
                Here is the code that you will be writing to a tsx file and adding a route to: 
                {request.code}
                """,
            }
        ],
    )
    return WriteAndRouteRequest(
        path=name_and_path.path,
        component_name=name_and_path.component_name,
        file_path=name_and_path.file_path,
        code=request.code,
    )


async def _write_tsx(request: WriteTsxRequest) -> Result:
    try:
        file_path = frontend_src_dir / request.file_path
        file_path.parent.mkdir(parents=True, exist_ok=True)

        if not os.access(file_path.parent, os.W_OK):
            return {
                "message": f"No write permission to directory: {file_path.parent}",
                "success": False,
            }

        with open(file_path, "w") as f:
            f.write(request.code)

        if file_path.exists():
            return {"message": "TSX file written successfully", "success": True}
        else:
            return {
                "message": "File write appeared to succeed but file doesn't exist",
                "success": False,
            }
    except Exception as e:
        return {"message": f"Failed to write TSX file: {str(e)}", "success": False}


async def _add_route(request: AddRouteRequest) -> Result:
    routes_file = frontend_src_dir / "routes.tsx"
    try:
        with open(routes_file, "r") as f:
            content = f.read()

        # Strip .tsx/.ts/.jsx/.js extension from component_name if present
        component_name = Path(request.component_name).stem

        # Create import path without extension
        import_path = f"./{Path(request.file_path).with_suffix('')}"
        # Match default imports (no brackets) instead of named imports
        import_pattern = rf"import\s+{re.escape(component_name)}\s+from.*['\"].*{re.escape(Path(request.file_path).stem)}['\"]"

        if not re.search(import_pattern, content):
            # Find the last import statement and add after it
            last_import_match = list(re.finditer(r"import.*\n", content))
            if last_import_match:
                end_pos = last_import_match[-1].end()
                # Use default import without brackets
                new_import = f'import {component_name} from "{import_path}";\n'
                content = content[:end_pos] + new_import + content[end_pos:]

        # Find the routes array and add the new route before the closing bracket
        # Look for the closing bracket of the routes array
        routes_pattern = r"(\s*\]\s*;?\s*$)"
        match = re.search(routes_pattern, content, flags=re.MULTILINE)

        if match:
            closing_bracket = match.group(1)

            # Simply add the new route with a comma before the closing bracket
            new_route = f""",
  {{
    path: "{request.path}",
    element: <{component_name} />,
  }}{closing_bracket}"""

            content = re.sub(
                routes_pattern, new_route, content, count=1, flags=re.MULTILINE
            )
        else:
            return {
                "message": "Could not find routes array closing bracket",
                "success": False,
            }

        with open(routes_file, "w") as f:
            f.write(content)

        return {"message": "Route added successfully", "success": True}
    except Exception as e:
        return {"message": f"Failed to add route: {str(e)}", "success": False}


@sio.event
async def write_tsx_and_add_route(sid: str, data: dict) -> None:
    try:
        generated_code = GeneratedCode.model_validate(data)
        write_and_add_route_request = await construct_write_and_add_route_request(
            generated_code
        )
    except ValidationError as e:
        await sio.emit(
            "write_tsx_and_add_route_response",
            {"message": f"Invalid data: {e}", "success": False},
            to=sid,
        )
        return

    write_result = await _write_tsx(write_and_add_route_request)
    if not write_result["success"]:
        response = SimpleResponse(
            id=f"write_tsx_and_add_route-{int(time.time())}",
            type="generative",
            content=write_result["message"],
            timestamp=int(time.time()),
        )
        await sio.emit("receive_assistant_message", response.model_dump_json(), to=sid)
        return

    add_route_result = await _add_route(write_and_add_route_request)
    response = SimpleResponse(
        id=f"write_tsx_and_add_route-{int(time.time())}",
        type="generative",
        content=add_route_result["message"],
        timestamp=int(time.time()),
    )
    await sio.emit("receive_assistant_message", response, to=sid)


async def add_route(sid: str, data: dict) -> None:
    try:
        request = AddRouteRequest.model_validate(data)
    except ValidationError as e:
        response = SimpleResponse(
            id=f"add_route-{int(time.time())}",
            type="generative",
            content=f"Invalid data: {e}",
            timestamp=int(time.time()),
        )
        await sio.emit("receive_assistant_message", response.model_dump_json(), to=sid)
        return

    result = await _add_route(request)
    response = SimpleResponse(
        id=f"add_route-{int(time.time())}",
        type="generative",
        content=result["message"],
        timestamp=int(time.time()),
    )
    await sio.emit("receive_assistant_message", response.model_dump_json(), to=sid)


async def write_tsx(sid: str, data: dict) -> None:
    try:
        request = WriteTsxRequest.model_validate(data)
    except ValidationError as e:
        response = SimpleResponse(
            id=f"write_tsx-{int(time.time())}",
            type="generative",
            content=f"Invalid data: {e}",
            timestamp=int(time.time()),
        )
        await sio.emit("receive_assistant_message", response.model_dump_json(), to=sid)
        return

    result = await _write_tsx(request)
    response = SimpleResponse(
        id=f"write_tsx-{int(time.time())}",
        type="generative",
        content=result["message"],
        timestamp=int(time.time()),
    )
    await sio.emit("receive_assistant_message", response.model_dump_json(), to=sid)
