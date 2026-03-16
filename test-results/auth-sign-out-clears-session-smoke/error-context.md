# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "HandleAppen" [level=1] [ref=e6]
      - paragraph [ref=e7]: Logg inn på din konto
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: E-post
          - textbox "E-post" [ref=e12]:
            - /placeholder: din@epost.no
            - text: logout-1773694317607@example.com
        - generic [ref=e13]:
          - generic [ref=e14]: Passord
          - textbox "Passord" [active] [ref=e15]:
            - /placeholder: ••••••••
            - text: password123
      - button "Logg inn" [ref=e16]
      - generic [ref=e21]: eller
      - button "Fortsett med Google" [ref=e22]
    - paragraph [ref=e23]:
      - text: Har du ikke konto?
      - link "Registrer deg" [ref=e24] [cursor=pointer]:
        - /url: /registrer
  - generic [ref=e28]:
    - generic [ref=e29]: "ENOENT: no such file or directory, open 'C:\\Users\\HP\\Documents\\Koding\\HandleAppen\\src\\service-worker.js'"
    - generic [ref=e30]: at async open (node:internal/fs/promises:636:25) at async Object.readFile (node:internal/fs/promises:1273:14) at async LoadPluginContext.handler (file:///C:/Users/HP/Documents/Koding/HandleAppen/node_modules/vite-plugin-pwa/dist/index.js:552:29) at async EnvironmentPluginContainer.load (file:///C:/Users/HP/Documents/Koding/HandleAppen/node_modules/vite/dist/node/chunks/config.js:28759:19) at async loadAndTransform (file:///C:/Users/HP/Documents/Koding/HandleAppen/node_modules/vite/dist/node/chunks/config.js:22628:21) at async viteTransformMiddleware (file:///C:/Users/HP/Documents/Koding/HandleAppen/node_modules/vite/dist/node/chunks/config.js:24542:20)
    - generic [ref=e31]:
      - text: Click outside, press Esc key, or fix the code to dismiss.
      - text: You can also disable this overlay by setting
      - code [ref=e32]: server.hmr.overlay
      - text: to
      - code [ref=e33]: "false"
      - text: in
      - code [ref=e34]: vite.config.ts
      - text: .
```