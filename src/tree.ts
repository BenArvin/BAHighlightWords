'use strict';
import  { SearchLocation } from './highlight'
import { TreeDataProvider, TreeItem, Event, EventEmitter, Command } from 'vscode'

class HighlightTreeProvider implements TreeDataProvider<HighlightNode> {
    public currentExpression: string = ""
    public currentIndex: SearchLocation = {index: 0, count: 0}
	private _onDidChangeTreeData: EventEmitter<HighlightNode|undefined|null|void> = new EventEmitter<HighlightNode|undefined|null|void>();
    readonly onDidChangeTreeData: Event<HighlightNode|undefined|null|void> = this._onDidChangeTreeData.event;
    
    constructor(public words: string[], public wordsCnt: {[word: string]: number}, public wordsIndex: {[word: string]: number}) {}

    getTreeItem(element: HighlightNode): TreeItem {
		return element;
	}

	getChildren(element?: HighlightNode): Thenable<HighlightNode[]> {
        let nodes: HighlightNode[] = this.words.map(w => {
            let cnt = w in this.wordsCnt ? this.wordsCnt[w] : 0
            let index = w in this.wordsIndex ? this.wordsIndex[w] : 0
            return new HighlightNode(`${w}[${cnt}]`, w, this)
        })
        return Promise.resolve(nodes)
    }

    public refresh(): any {
		this._onDidChangeTreeData.fire();
	}

}

export class HighlightNode extends TreeItem {

	constructor(
        public readonly label: string,
        public readonly highlight: string,
        public provider: HighlightTreeProvider,
        public readonly command?: Command

	) {
		super(label);
    }

	contextValue = 'highlights';

}

export default HighlightTreeProvider