import os
import re
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/push-code")

# Use absolute path to avoid relative path issues
base_dir = Path(__file__).parent.parent.parent.parent
frontend_src_dir = base_dir / "frontend" / "src"


class WriteCodeRequest(BaseModel):
    code: str


class AddRouteRequest(BaseModel):
    path: str
    element: str
    import_name: str
    import_path: str


@router.get("/pwd")
def push_code() -> dict[str, str]:
    return {"message": f"pwd: {base_dir.resolve()}"}


@router.post("/write-code")
def write_code(request: WriteCodeRequest) -> dict[str, str | bool]:
    print(f"DEBUG: write_code called with code: {request.code}")
    print(f"DEBUG: parent_dir: {base_dir.resolve()}")
    print(f"DEBUG: Current working directory: {os.getcwd()}")

    file_path = base_dir / "code.py"
    print(f"DEBUG: Attempting to write to: {file_path.absolute()}")

    try:
        # Check if we can write to the directory
        if not os.access(base_dir, os.W_OK):
            return {
                "message": f"No write permission to directory: {base_dir}",
                "success": False,
            }

        with open(file_path, "w") as f:
            f.write(request.code)

        # Verify the file was actually written
        if file_path.exists():
            file_size = file_path.stat().st_size
            print(f"DEBUG: File written successfully. Size: {file_size} bytes")
            return {"message": "Code written successfully", "success": True}
        else:
            return {
                "message": "File write appeared to succeed but file doesn't exist",
                "success": False,
            }

    except OSError as e:
        print(f"DEBUG: OSError occurred: {e}")
        return {"message": f"Failed to write file: {str(e)}", "success": False}
    except Exception as e:
        print(f"DEBUG: Unexpected error: {e}")
        return {"message": f"Unexpected error: {str(e)}", "success": False}


@router.post("/add-route")
def add_route(request: AddRouteRequest) -> dict[str, str | bool]:
    routes_file = frontend_src_dir / "routes.tsx"

    try:
        print(f"DEBUG: Attempting to modify routes file: {routes_file}")

        # Read the existing file
        with open(routes_file, "r") as f:
            content = f.read()

        print(f"DEBUG: File content length: {len(content)} characters")

        # Add import statement if it doesn't exist
        import_pattern = rf"import.*{request.import_name}.*from.*{request.import_path}"
        if not re.search(import_pattern, content):
            print(f"DEBUG: Adding import statement for {request.import_name}")
            # Find the last import statement and add after it
            import_match = re.search(r"(import.*\n)", content)
            if import_match:
                new_import = (
                    f'import {request.import_name} from "{request.import_path}";\n'
                )
                content = (
                    content[: import_match.end()]
                    + new_import
                    + content[import_match.end() :]
                )
                print("DEBUG: Import statement added")

        # Add the new route to the routes array
        # Find the routes array and insert before the closing bracket
        routes_pattern = r"(\s*\]\s*;?\s*$)"
        new_route = f"""  {{
    path: "{request.path}",
    element: <{request.element} />,
  }},
]"""

        # Replace the closing bracket with the new route + closing bracket
        if re.search(routes_pattern, content, flags=re.MULTILINE):
            content = re.sub(routes_pattern, new_route, content, flags=re.MULTILINE)
            print("DEBUG: Route added to routes array")
        else:
            return {
                "message": "Could not find routes array closing bracket",
                "success": False,
            }

        # Write back to file
        with open(routes_file, "w") as f:
            f.write(content)

        print("DEBUG: File written back successfully")
        return {"message": "Route added successfully", "success": True}

    except Exception as e:
        print(f"DEBUG: Error adding route: {e}")
        return {"message": f"Failed to add route: {str(e)}", "success": False}


class WriteTsxRequest(BaseModel):
    file_path: str  # e.g., "components/MyComponent.tsx"
    code: str  # The entire TSX code content


@router.post("/write-tsx")
def write_tsx(request: WriteTsxRequest) -> dict[str, str | bool]:
    try:
        # Build the full file path within the frontend/src directory
        file_path = frontend_src_dir / request.file_path

        print(f"DEBUG: Attempting to write TSX file: {file_path}")
        print(f"DEBUG: File content length: {len(request.code)} characters")

        # Ensure the parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Check if we can write to the target directory
        if not os.access(file_path.parent, os.W_OK):
            return {
                "message": f"No write permission to directory: {file_path.parent}",
                "success": False,
            }

        # Write the TSX file
        with open(file_path, "w") as f:
            f.write(request.code)

        # Verify the file was actually written
        if file_path.exists():
            file_size = file_path.stat().st_size
            print(f"DEBUG: TSX file written successfully. Size: {file_size} bytes")
            return {"message": "TSX file written successfully", "success": True}
        else:
            return {
                "message": "File write appeared to succeed but file doesn't exist",
                "success": False,
            }

    except Exception as e:
        print(f"DEBUG: Error writing TSX file: {e}")
        return {"message": f"Failed to write TSX file: {str(e)}", "success": False}
