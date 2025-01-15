// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import HighlightConfig from './config'
import Highlight from './highlight'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let highlight = new Highlight()
    let configValues

    vscode.commands.registerCommand('bahighlightwords.addHighlight', function () {
        highlight.addSelected()
    });

    vscode.commands.registerCommand('bahighlightwords.removeHighlight', function () {
        vscode.window.showQuickPick(highlight.getWords().concat(['* All *']).map(w => {
            return {
                label: w,
                description: '',
                detail: ''
            }
        })).then(word => {
            if (word) {
                highlight.remove(word.label)
            }
        })
    });

    vscode.commands.registerCommand('bahighlightwords.treeRemoveHighlight', e => {
        highlight.remove(e.highlight)
    })

    vscode.commands.registerCommand('bahighlightwords.treeRemoveAllHighlight', e => {
        highlight.remove('* All *')
    })

    vscode.commands.registerCommand('bahighlightwords.removeAllHighlights', function () {
        highlight.clearAll()
    });

    function next(e: any, wrap?:boolean) {
        const doc = vscode.window.activeTextEditor!.document
        const ed = vscode.window.activeTextEditor!
        let curPos = ed.selection.active
        let pattern = e.highlight
        let nextPos = highlight.moveToNextPos(pattern, curPos)
        const start = nextPos
        const end = new vscode.Position(start.line, start.character+pattern.length)
        const range = new vscode.Range(start, end)
        vscode.window.activeTextEditor!.revealRange(range)
        vscode.window.activeTextEditor!.selection = new vscode.Selection(start, start)
    }

    vscode.commands.registerCommand('bahighlightwords.findNext', e => {
        next(e)
    });

    function prev(e: any, wrap?:boolean) {
        const doc = vscode.window.activeTextEditor!.document
        const ed = vscode.window.activeTextEditor!
        let curPos = ed.selection.active
        let pattern = e.highlight
        let nextPos = highlight.moveToPrevPos(pattern, curPos)
        const start = nextPos
        const end = new vscode.Position(start.line, start.character+pattern.length)
        const range = new vscode.Range(start, end)
        vscode.window.activeTextEditor!.revealRange(range)
        vscode.window.activeTextEditor!.selection = new vscode.Selection(start, start)
    }

    vscode.commands.registerCommand('bahighlightwords.findPrevious', e => {
        prev(e)        
    });

    updateConfig()

    function updateConfig() {
        configValues = HighlightConfig.getConfigValues()
        highlight.setDecorators(configValues.decorators)
        vscode.commands.executeCommand('setContext', 'showSidebar', configValues.showSidebar)
    }

    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        triggerUpdateDecorations();
    }

    vscode.workspace.onDidChangeConfiguration(() => {
        updateConfig()
    })

    vscode.window.onDidChangeVisibleTextEditors(function (editor) {
        highlight.updateDecorations();
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(function (event) {
        activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    var timeout: NodeJS.Timeout = setTimeout(() => {
        highlight.updateActive()
    }, 500);
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            highlight.updateActive()
        }, 500);
    }

}

// This method is called when your extension is deactivated
export function deactivate() {}
