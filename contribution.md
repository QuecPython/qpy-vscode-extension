# Contribution guide

- update vs code to latest version.
- Update librarires, vs code version, ts version twice a month
- We use typescript for this extetion and file extetion.ts
- Follow these commands:

```
# update npm version
> npm install -g npm@latest
# update libs
> npm update
# update typescript
> npm install typescript@latest --save-dev
```

Notes:
- To check different verions of TS, use:
    - Open any TypeScript file in VS Code.
    - In Command Palette: Type and select TypeScript: Select TypeScript Version....
    - Choose the workspace version of TypeScript.
- update npm version in package.json
```
	"engines": {
		"vscode": "^1.95.3",
		"npm": ">=11.1.0"
	},
```
