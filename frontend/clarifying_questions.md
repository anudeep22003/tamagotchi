# Clarifying Questions for App Replication

Based on my analysis of the sample app and task requirements, I need clarification on several points to ensure accurate implementation:

## Core Architecture Questions

1. **Multi-App Structure**: The CLAUDE.md mentions this will be an "app of apps" where GPT5 builds multiple apps that plugin to the same data repo. Should I:
   - Set up React Router with dynamic routes for different apps?
   Yes, I will use react router. 
   - Create a framework for registering/loading new apps?
   Just create a central router object that reads that when I like an app will create a new page, and the app will be added to the router object. Then I can show all the apps by parsing through the router object and showing available routes. 
   - Or focus on the basic streaming UI structure first and add the multi-app capability later?
   Focus on the basic streaming UI structure first. Do the multi-app capability later. 

2. **Backend Contract**: You mentioned the backend is set up with the same contract as the sample app. Should I:
   - Use the exact same socket events (`request_chat_stream`, `receive_assistant_message`, `hello`)?
   - Keep the same message structure (StreamingResponse, SimpleResponse types)?
   - Use the same BACKEND_URL configuration pattern?
   Yes to all. BACKEND_URL is in the .env file. You can read it using `import.meta.env.VITE_BACKEND_URL`. 

## UI/UX Design Questions

3. **Interface Customization**: The task mentions keeping the interface "customizable" but removing settings that aren't necessary. Should I:
   - Remove the "Switch Sides" functionality from GenerativeArea?
   Yes. 
   - Keep the mobile view toggle between Human/Generative areas?
   Yes. 
   - Remove the recording functionality entirely?
   Actually keep this. Dont wire this up we will do that later. 
   - Keep the basic layout customizable in some other way?
   No. The one change is to make the textarea auto resize. 

4. **Streaming UI**: For the "streaming ui where I can see the app being built", should I:
   - Use the same streaming approach as the sample (real-time message updates)?
   Yes. 
   - Display the streaming content differently than conversational messages?
   No. Keep it same and simple.  
   - Add any visual indicators for "app building" vs regular chat?
   Hmm, we can do that later. I will likely make it a new type but for now just keep it same. 

## Technical Implementation Questions

5. **Dependencies**: I notice the current package.json is missing some dependencies from the sample app:
   - Should I add `socket.io-client` for websockets?
   I just added it, it will now be there. 
   - Do you want me to keep the existing dependencies or match the sample app exactly?
   Keep the existing dependencies. Only add what is necessary.  
   - The sample uses `immer` and `@microsoft/fetch-event-source` - are these needed?
   No, that was because I originally built an EventSource for SSE, but a websocker supersedes that. 

6. **File Structure**: Should I:
   - Replicate the exact folder structure from sample app (hooks/, context/, types/)?
   I think its a good structure, so only change it if it makes sense. 
   - Adapt it to fit the existing structure in the current frontend?
   Yes. 
   - Create new patterns optimized for the multi-app architecture?
   Yes. 

7. **Testing Setup**: For the "hello query" test you mentioned:
   - Should this be a simple button/input that sends a hello message and displays the streamed response?
   I should just be able to type a message in the textarea and see the response stream in. 
   - What should the test response look like to verify everything is working?
   Nothing specific, the response should be streamed. 
   - Should I create a dedicated test page or integrate it into the main interface?
   It will be a manual test, I will type a query and submit it and I should see a response. Simple. 

## Data Management Questions

8. **State Management**: The sample app uses React context for state. For the multi-app structure:
   - Should each "app" have its own isolated state?
   The context should be shared, since all apps share same data source they should have all this shared. I will send this to the llm as well for the app building context.  
   - Should there be shared global state for common data?
   Yes. 
   - When do I introduce Zustand vs sticking with React context?
   I am not sure, lets figure it out as we go. For now I think we dont need it.  

9. **Message Types**: The sample has human/assistant/generative message types. For app building:
   - Do we need additional message types for "app code", "app preview", etc?
   We will, but for now keep it as is. Ill add types later.  
   - Should the message structure be extended to support app metadata?
   - How should "commit" events be handled in the message flow?
   We will figure this out later. Dont be hung up on this. 

## Immediate Next Steps

10. **Priority Order**: What should I implement first:
    - Basic HumanArea + GenerativeArea layout with streaming?
    yes. 
    - Socket connection and hello test functionality?
    yes.
    - Router setup for multi-app structure?
    yes.
    - Or something else entirely?
    Your order is good. 

Once one part is done, commit first before making the next change. 

Please prioritize which questions are most important for getting started, and I can begin implementation immediately after your responses.