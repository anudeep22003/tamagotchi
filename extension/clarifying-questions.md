# Clarifying Questions for Chrome Extension Development

Based on the task requirements and existing codebase, I need clarification on the following technical decisions and implementation details:

## Backend Configuration

1. **Backend Endpoint Configuration**
   - What is the backend API URL that will receive the HTML data?
   Keep it configurable for me to change. Assume for now localhost:8085.
   - Should this URL be configurable by the user or hardcoded?
   Yes
   - What HTTP method should be used (POST, PUT, etc.)?
   POST

2. **API Request Format**
   - What should the request payload structure look like? Should it be:
     ```typescript
     { html: string, url: string, timestamp: string } 
     // or something else?
     ```
   - Are there any required headers (authentication, content-type, etc.)?
   Yes, content-type: application/json
   - Do you need additional metadata sent with the HTML (page title, URL, timestamp)?
   Yes page title, url, timestamp

3. **API Response Format** 
   - What does a successful response look like from your backend?
   I am yet to decide, so keep this configurable. 
   - What error response format should I expect?
   Keep the shape configurable. 
   - How should success/error messages be displayed to the user in the sidepanel?
   You decide based on UI best practices. 

## HTML Extraction Scope

4. **HTML Content Scope**
   - Should I capture the entire `document.documentElement.outerHTML`?
   Yes
   - Do you want just the visible content or the full DOM including `<head>`?
   Just the visible content.
   - Should I clean/sanitize the HTML before sending (remove scripts, styles)?
   Yes, remove scripts, styles. Use DOMPurify.
   - Any specific elements to exclude or include?
   Use DOMPurify with strict mode. 

## Permissions and Security

5. **Host Permissions**
   - Should the extension work on all websites (`*://*/*`) or specific domains?
   For now assume all, in the future I may choose to narrow it down.
   - Do you need permissions for specific backend domains for API calls?
   No
   - Should I request `activeTab` permission or broader `tabs` permission?
   activeTab

6. **Content Security Policy**
   - Are there any CSP requirements for the backend communication?
    I dont know, make the best choice based on the neighboring context I have provided.

## UI/UX Requirements

7. **Sidepanel Interface**
   - Should there be any configuration options in the sidepanel (backend URL, etc.)?
    No, I will set the backend URL in the code. 
   - What should the success message say? ("HTML sent successfully"?)
   "HTML sent successfully"
   - How should errors be displayed (toast, inline message, alert)?
   Message inside the sidepanel. 
   - Should there be a loading state while sending the request?
   Yes

8. **Extension Icon Behavior**
   - Should clicking the extension icon ALWAYS open the sidepanel, or only when the sidepanel is not already open?
   Only when the sidepanel is not already open. 
   - Any specific behavior for when the extension icon is right-clicked?
   No

## Architecture Decisions

9. **Message Passing Structure**
   - Should I use `chrome.runtime.sendMessage` or `chrome.tabs.sendMessage` for communication?
   chrome.runtime.sendMessage
   - Do you prefer promise-based or callback-based message handling?
   Promise-based

10. **Error Handling Strategy**
    - How should network errors be handled (retry logic, user notification)?
    Retry logic is not needed. User notification is needed. 
    - What happens if the current page has no HTML or is a restricted page?
    Show a message in the sidepanel. 
    - Should failed requests be stored locally for retry later?
    No

## Future Debugger Integration

11. **Debugger Preparation**
    - Should I structure the code to easily add debugger attachment later?
    - Any specific architecture patterns you want for future fetch interception?
    - Should I create placeholder interfaces/types for debugger data?
    Skip the debugger for now. Do not do any work on this. 

## Development Environment

12. **Testing and Validation**
    - Do you have any preference for how I should test the extension during development?
    - Should I add any console logging for debugging during development?
    - Any specific error scenarios you want me to handle/test?
    Make best choices based on the neighboring context I have provided. 

## TypeScript Configuration

13. **Type Safety**
    - Should the backend request/response interfaces be in a separate types file?
    Yes, I like modular code.
    - How strict should the TypeScript configuration be?
    Strict
    - Any specific naming conventions for interfaces/types?
    Keep it simple. 

Please answer these questions as thoroughly as possible so I can implement the extension exactly to your needs and avoid any rework.