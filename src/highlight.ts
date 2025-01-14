'use strict';
import { window, TextEditorDecorationType, Range, QuickPickItem, Position} from 'vscode';
import HighlightTreeProvider from './tree'

export interface SearchLocation {
    index: number
    count: number
}

class TrieNode {
    children: Map<string, TrieNode>;
    fail: TrieNode | null;
    output: string[];

    constructor() {
        this.children = new Map();
        this.fail = null;
        this.output = [];
    }
}

class ACAutomaton {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    addPattern(pattern: string) {
        let node = this.root;
        for (const char of pattern) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char)!;
        }
        node.output.push(pattern);
    }

    buildFailPointers() {
        const queue: TrieNode[] = [];
        for (const child of this.root.children.values()) {
            child.fail = this.root;
            queue.push(child);
        }

        while (queue.length > 0) {
            const currentNode = queue.shift()!;
            for (const [char, childNode] of currentNode.children) {
                let failNode = currentNode.fail;
                while (failNode && !failNode.children.has(char)) {
                    failNode = failNode.fail;
                }
                if (failNode) {
                    childNode.fail = failNode.children.get(char)!;
                } else {
                    childNode.fail = this.root;
                }
                childNode.output = childNode.output.concat(childNode.fail.output);
                queue.push(childNode);
            }
        }
    }

    search(text: string): { [pattern: string]: number[] } {
        const results: { [pattern: string]: number[] } = {};
        let node = this.root;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            while (node && !node.children.has(char)) {
                node = node.fail!;
            }
            if (node) {
                node = node.children.get(char)!;
                if (node.output.length > 0) {
                    for (let patternItem of node.output) {
                        if (!(patternItem in results)) {
                            results[patternItem] = []
                        }
                        results[patternItem].push(i - patternItem.length);
                    }
                }
            } else {
                node = this.root;
            }
        }
        return results;
    }
}

class Highlight {
    private words: string[]
    private ac = new ACAutomaton();
    private decorators: TextEditorDecorationType[]
    private treeProvider: HighlightTreeProvider
    private ranges: {[key: string]: any}
    private wordsCnt: {[word: string]: number} = {}
    private wordsIndex: {[word: string]: number} = {}

    constructor() {
        this.words = []
        this.decorators = []
        this.treeProvider = new HighlightTreeProvider(this.getWords(), this.wordsCnt, this.wordsIndex);
        this.ranges = {}
        this.retrainAc()
        window.registerTreeDataProvider('bahilightWordsExplore', this.treeProvider);
    }

    public getWords() { 
        return this.words
    }
    public setDecorators(d: TextEditorDecorationType[]) { this.decorators = d }

    public updateDecorations(active?: any) {
        window.visibleTextEditors.forEach(editor => {
            if (active && editor.document != window.activeTextEditor!.document) return;
            const text = editor.document.getText();
            let decs: any[] = [];
            this.decorators.forEach(function () {
                let dec: any[] = [];
                decs.push(dec);
            });
            let searchResults = this.ac.search(text)
            this.ranges = {}
            this.wordsCnt = {}
            Object.keys(searchResults).forEach(pattern => {
                const positions = searchResults[pattern];
                this.wordsCnt[pattern] = positions.length
                let patternLen = pattern.length
                for (let posItem of positions) {
                    const startPos = editor.document.positionAt(posItem + 1);
                    const endPos = editor.document.positionAt(posItem + patternLen + 1);
                    const decoration = { range: new Range(startPos, endPos) };
                    if (!(pattern in this.ranges)) {
                        this.ranges[pattern] = []
                    }
                    let index = this.words.indexOf(pattern)
                    decs[index % decs.length].push(decoration);
                    this.ranges[pattern].push(decoration.range)
                }
            });
            this.decorators.forEach(function (d, i) {
                editor.setDecorations(d, decs[i]);
            });
            this.treeProvider.words = this.words
            this.treeProvider.wordsCnt = this.wordsCnt
            this.treeProvider.wordsIndex = this.wordsIndex
            this.treeProvider.refresh()

        })

    }

    private retrainAc() {
        this.ac = new ACAutomaton();
        for (let item of this.words) {
            this.ac.addPattern(item)
        }
        this.ac.buildFailPointers()
    }

    public clearAll() {
        this.words = []
        this.retrainAc()
        this.updateDecorations()
    }

    public remove(word: string) {
        if (!word) return;
        if (word == '* All *') {
            this.words = []
            this.retrainAc()
        } else {
            const highlights = this.words.filter(w => w == word)
            if (highlights && highlights.length) {
                this.words.splice(this.words.indexOf(highlights[0]), 1);
            }
            this.retrainAc()
        }
        this.updateDecorations();
    }

    public updateActive() {
        this.updateDecorations(true)
    }

    public addSelected() {
        const editor = window.activeTextEditor;
        let word = editor!.document.getText(editor!.selection);
        if(!word) {
            const range = editor!.document.getWordRangeAtPosition(editor!.selection.start)
            if(range) word = editor!.document.getText(range)
        }
        if (!word) {
            window.showInformationMessage('Nothing selected!')
            return;
        }
        this.addNewWordAndUpdate(word);
    }

    public moveToNextPos(pattern: string, curPos: Position) : Position {
        if (!(pattern in this.ranges)) {
            return curPos
        }
        let rangeList = this.ranges[pattern]
        for (let item of rangeList) {
            let rangeItem: Range = item
            if (rangeItem.start.isAfter(curPos)) {
                return rangeItem.start
            }
        }
        let rangeItem: Range = rangeList[0]
        return rangeItem.start
    }

    public moveToPrevPos(pattern: string, curPos: Position) : Position {
        if (!(pattern in this.ranges)) {
            return curPos
        }
        let rangeList = this.ranges[pattern]
        for (let i = rangeList.length - 1; i >= 0; i--) {
            let rangeItem: Range = rangeList[i]
            if (rangeItem.start.isBefore(curPos)) {
                return rangeItem.start
            }
        }
        let rangeItem: Range = rangeList[rangeList.length - 1]
        return rangeItem.start
    }

    private addNewWordAndUpdate(word: string) {
        var index = 0
        for (let item of this.words) {
            if (item.indexOf(word) != -1) {
                if (item.length == word.length) {
                    this.words.splice(index,1)
                    this.retrainAc()
                    this.updateDecorations()
                }
                return
            }
            index = index + 1
        }
        var newWords: string[] = []
        for (let item of this.words) {
            if (word.indexOf(item) == -1) {
                newWords.push(item)
            }
        }
        newWords.push(word)
        this.words = newWords;
        this.retrainAc()
        this.updateDecorations()
    }
}

export default Highlight