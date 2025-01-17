'use strict';
import * as vscode from 'vscode';

interface HighlightColors {
    light: string
    dark: string
}

interface BoxOptions {
    light: boolean
    dark: boolean
}

interface ConfigValues {
    decorators: vscode.TextEditorDecorationType[]
    defaultMode?: number,
    showSidebar?: boolean
}

class HighlightConfig {
    static getConfigValues() :ConfigValues {
        let config = vscode.workspace.getConfiguration('bahighlightwords')
        let colors: HighlightColors[] = <HighlightColors[]>config.get('colors');
        let box = config.get<BoxOptions>('box')
        const defaultMode = <number>config.get('defaultMode')
        const showSidebar = <boolean>config.get('showSidebar')
    
        let decorators: vscode.TextEditorDecorationType[] = [];
        colors.forEach(function (color) {
            var dark: vscode.ThemableDecorationRenderOptions = {
                // this color will be used in dark color themes
                overviewRulerColor: color.dark,
                backgroundColor: (box && box.dark) ? 'inherit' : color.dark,
                borderColor: color.dark
            }
            if(!box || !box.dark) 
                dark.color = '#555555'
            let decorationType = vscode.window.createTextEditorDecorationType({
                borderWidth: '2px',
                borderStyle: 'solid',
                overviewRulerLane: vscode.OverviewRulerLane.Full,
                light: {
                    // this color will be used in light color themes
                    overviewRulerColor: color.light,
                    borderColor: color.light,
                    backgroundColor: (box && box.light) ? 'inherit' : color.light
                },
                dark: dark
            });
            decorators.push(decorationType);
        });
    
        return {decorators, defaultMode, showSidebar}  
    }
}

export default HighlightConfig