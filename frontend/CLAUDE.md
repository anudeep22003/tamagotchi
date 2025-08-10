This is going to be an app of apps. Essentially this app will allow you to build multiple apps, where gpt5 is going to help build brand new apps from ground up using the context of the project. I will pass things like package.json, exposed interfaces, types protocols, etc. and GPT5 will use that to build the app.

This will be a cool demo, where I can one shot multiple apps and they plugin to the same data repo so it is useful from birth. 

I am going to have a streaming ui, where I can see the app being built. There will be a human area on the left and a generative area on the right. The UI is going to allow the user to repeatedly iterate on the output on the right, and when they are happy with it then can commit and this will be shown on a new page. The react router will collect all the pages under a particular route, each page is an app in our context. Different UIs but shared data. 

Libraries to use:
- socket.io-client (for websocket connections)
- shadcn/ui
- react-router
- zod (for validation)
- zustand (if required, dont use prematurely)
- tailwindcss
- axios (for api calls)

Use bun for package manager. 


Use good coding principles, and good ui design principles:
- Do not repeat yourself
- premature optimization is the root of all evil
- Introduce the minimum number of changes to achieve the desired task
- Code should be self-documenting, no comments unless necessary
- All names should be descriptive and meaningful and read like elegant prose in the stacktrace
- Use the most specific type possible, try your hardest not to use `Any`
- files should not be longer than 200 lines of code
