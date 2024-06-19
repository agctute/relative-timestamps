import {App, Editor, MarkdownView, moment, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface RtPluginSettings {
	lastTimeStamp: string;
	includeCurrentTime: boolean;
	savePageTime: boolean;
}

const DEFAULT_SETTINGS: RtPluginSettings = {
	lastTimeStamp: '2024-05-31-12-00-00',
	includeCurrentTime: true,
	savePageTime: true
}

export default class RelativeTimestampsPlugin extends Plugin {
	settings: RtPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'reset-timestamp',
			name: 'Reset timestamp',
			callback: () => {
				const now = new Date();
				const stamp = moment(now).format('YYYYMMDDHHmmss');
				this.settings.lastTimeStamp = stamp;
				this.saveSettings();
				new Notice('New saved time: ' + stamp);
			},
		});

		this.addCommand({
			id: 'insert-relative-timestamp',
			name: 'Insert relative time',
			editorCallback: async (editor) => {
				const now = new Date();
				const last = moment(this.settings.lastTimeStamp,'YYYYMMDDHHmmss')
				const stamp = moment(now);
				const out = moment.duration(last.diff(stamp)).humanize()
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);

				if(this.settings.savePageTime) {
					if(view && view.file) {
						await this.app.fileManager.processFrontMatter(view.file, (frontmatter) => {
							frontmatter['lasttime'] = moment(now).format('YYYYMMDDHHmmss');
						});
					}
				}

				if(this.settings.lastTimeStamp == null || this.settings.lastTimeStamp == '' || this.settings.lastTimeStamp == moment(now).format('YYYYMMDDHHmmss')) {
					editor.replaceSelection(stamp.format('hh:mm A'));
				}
				else if(this.settings.includeCurrentTime) {
					editor.replaceSelection(stamp.format('hh:mm A') + ' (' + out + ')');
				} else {
					editor.replaceSelection(out);
				}
				this.settings.lastTimeStamp = moment(now).format('YYYYMMDDHHmmss');
				this.saveSettings();
			},
		});

		// Command to save the time selected
		this.addCommand({
			id: 'save-timestamp',
			name: 'Save timestamp',
			editorCallback: (editor) => {
				const selected = editor.getSelection();
				const stamp = moment(selected, 'hh:mm A').format('YYYYMMDDHHmmss');
				this.settings.lastTimeStamp = stamp;
				this.saveSettings();
			}
		});

		// Command to execute on loading a new page
		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (file) {
				const meta = this.app.metadataCache.getFileCache(file);
			}
			if(meta.frontmatter && meta.frontmatter['lasttime']) {
				this.settings.lastTimeStamp = meta.frontmatter['lasttime'];
			} else {
				this.settings.lastTimeStamp = '';
			}

		}));

		this.addSettingTab(new RelTimeSettingTab(this.app, this));

		this.app.metadataCache.on('changed', (file) => {
			const meta = this.app.metadataCache.getFileCache(file);
			if (meta == undefined) {
				return;
			}
			if(meta.frontmatter && meta.frontmatter['lasttime'] !== undefined) {
				this.settings.lastTimeStamp = meta.frontmatter['lasttime'];
			} else {
				this.settings.lastTimeStamp = '';
			}
		});
	}

	onunload() {}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class RelTimeSettingTab extends PluginSettingTab {
	plugin: RelativeTimestampsPlugin;

	constructor(app: App, plugin: RelativeTimestampsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// new Setting(containerEl)
		// 	.setName('Last used timestamp')
		// 	.setDesc('Timestamp to be used for relative comparison')
		// 	.addText(text => text
		// 		.setValue(this.plugin.settings.lastTimeStamp)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.lastTimeStamp = value;
		// 			await this.plugin.saveSettings();
		// 		}));

		new Setting(containerEl)
			.setName('Save timestamps by page')
			.setDesc('Save the last used timestamp on the frontmatter of the page')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.savePageTime)
				.onChange(async (value) => {
					this.plugin.settings.savePageTime = value;
					await this.plugin.saveSettings();
				}));
	}
}
