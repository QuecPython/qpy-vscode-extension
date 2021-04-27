import { ModuleDocument } from "../deviceTree/moduleFileSystem";

export const removeTreeNodeByName = (
	param: string,
	documents: ModuleDocument[]
): void => {
	const index = documents.findIndex(
		(doc: ModuleDocument) => doc.label === param
	);
	if (index > -1) {
		documents.splice(index, 1);
	}
};

export const initTree = (array: Object[]): ModuleDocument[] => {
	const initialTree: ModuleDocument[] = [];

	array.forEach((doc: any) => {
		if (!doc.sub) {
			initialTree.push(new ModuleDocument(doc.name, doc.size, doc.path));
		} else {
			doc.sub = initTree(doc.sub);
			initialTree.push(
				new ModuleDocument(doc.name, doc.size, doc.path, doc.sub)
			);
		}
	});

	return initialTree;
};

export const removeTreeNodeByPath = (documents: ModuleDocument[], path: string): void => {
	const index = documents.findIndex(doc => doc.filePath === path);
	if (index === -1) {
		documents.forEach(
			doc => doc.children && removeTreeNodeByPath(doc.children, path)
		);
	} else {
		documents.splice(index, 1);
	}
};

export const findTreeNode = (
	documents: ModuleDocument[],
	path: string
): ModuleDocument | undefined => {
	let foundDir = documents.find((doc: ModuleDocument) => doc.filePath === path);
	if (!foundDir) {
		for (let i = 0; i < documents.length; i++) {
			if (documents[i].children) {
				foundDir = findTreeNode(documents[i].children, path);
				if (foundDir) {
					return foundDir;
				}
			}
		}
	}

	return foundDir;
};


export const sortTreeNodes = (array: ModuleDocument[]): ModuleDocument[] => {
	array.sort(function (x: ModuleDocument, y: ModuleDocument) {
		const xLabel = x.label.toUpperCase();
		const yLabel = y.label.toUpperCase();

		if (x.size === '' || y.size === '') {
			if (x.size < y.size) {
				return -1;
			}
	
			if (x.size > y.size) {
				return 1;
			}
	
			if (x.size === y.size) {
				return xLabel === yLabel ? 0 : xLabel > yLabel ? 1 : -1;
			}
	
		}
		
		return xLabel === yLabel ? 0 : xLabel > yLabel ? 1 : -1;
	});

	array.forEach(function (doc: ModuleDocument) {
        if (doc.children) {
            sortTreeNodes(doc.children);
        }
    });

	return array;
};
