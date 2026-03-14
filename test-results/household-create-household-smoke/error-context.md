# Page snapshot

```yaml
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
          - text: test-1773486968192@example.com
      - generic [ref=e13]:
        - generic [ref=e14]: Passord
        - textbox "Passord" [ref=e15]:
          - /placeholder: ••••••••
          - text: testpass123
    - button "Logg inn" [active] [ref=e16]
    - generic [ref=e21]: eller
    - button "Fortsett med Google" [ref=e22]
  - paragraph [ref=e23]:
    - text: Har du ikke konto?
    - link "Registrer deg" [ref=e24] [cursor=pointer]:
      - /url: /registrer
```