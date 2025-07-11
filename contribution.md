# Contribution guide

## semi monthly update for the extention:
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
# check outdated libs, update them, fix issues
> npm outdated
# update the lib
>  npm install <name of lib>@latest
# install new lib and run extention
> npm install
```

### Notes:
- To check different verions of TS, use:
    - Open any TypeScript file in VS Code.
    - In Command Palette: Type and select TypeScript: Select TypeScript Version....
    - Choose the workspace version of TypeScript.
- update npm version in `package.json`
```
	"engines": {
		"vscode": "^1.102.0",
		"npm": ">=11.4.0"
	},
```
- in case of issues with new libs, delete `node_modules` and reinstall libs using `npm install`. In case issue not fixed, update the code where error accord.