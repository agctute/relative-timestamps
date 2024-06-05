import { App, Editor, MarkdownView, moment, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface RtPluginSettings {
	lastTimeStamp: string;
	includeCurrentTime: boolean;
}

const DEFAULT_SETTINGS: RtPluginSettings = {
	lastTimeStamp: '2024-05-31-12-00-00',
	includeCurrentTime: true
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
			editorCallback: (editor) => {
				const now = new Date();
				const last = moment(this.settings.lastTimeStamp,'YYYYMMDDHHmmss')
				const stamp = moment(now);
				const out = moment.duration(last.diff(stamp)).humanize()
				if(this.settings.includeCurrentTime) {
					editor.replaceSelection(stamp.format('hh:mm A') + ' (' + out + ')');
				} else {
					editor.replaceSelection(out);
				}
			},
		});
	}

	onunload() {

	}

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

		new Setting(containerEl)
			.setName('Last used timestamp')
			.setDesc('Timestamp to be used for relative comparison')
			.addText(text => text
				.setValue(this.plugin.settings.lastTimeStamp)
				.onChange(async (value) => {
					this.plugin.settings.lastTimeStamp = value;
					await this.plugin.saveSettings();
				}));
	}
}
