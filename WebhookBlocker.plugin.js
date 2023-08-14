/**
 * @name WebhookBlocker
 * @author Bianca Haven
 * @version 1.0.0
 * @description Allows you to block webhooks by name.
 */

// Credit to https://mwittrien.github.io/ for most of the work, and the BDFDB library underlying this.
// Last modified 14/08/2023.

module.exports = (_ => {
	const changeLog = {};

	return !window.BDFDB_Global || (!window.BDFDB_Global.loaded && !window.BDFDB_Global.started) ? class {
		constructor (meta) {for (let key in meta) this[key] = meta[key];}
		getName () {return this.name;}
		getAuthor () {return this.author;}
		getVersion () {return this.version;}
		getDescription () {return `The Library Plugin needed for ${this.name} is missing. Open the Plugin Settings to download it. \n\n${this.description}`;}
		downloadLibrary () {
			require("request").get("https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js", (e, r, b) => {
				if (!e && b && r.statusCode == 200) require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0BDFDB.plugin.js"), b, _ => BdApi.showToast("Finished downloading BDFDB Library", {type: "success"}));
				else BdApi.alert("Error", "Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library");
			});
		}
		
		load () {
			if (!window.BDFDB_Global || !Array.isArray(window.BDFDB_Global.pluginQueue)) window.BDFDB_Global = Object.assign({}, window.BDFDB_Global, {pluginQueue: []});
			if (!window.BDFDB_Global.downloadModal) {
				window.BDFDB_Global.downloadModal = true;
				BdApi.showConfirmationModal("Library Missing", `The Library Plugin needed for ${this.name} is missing. Please click "Download Now" to install it.`, {
					confirmText: "Download Now",
					cancelText: "Cancel",
					onCancel: _ => {delete window.BDFDB_Global.downloadModal;},
					onConfirm: _ => {
						delete window.BDFDB_Global.downloadModal;
						this.downloadLibrary();
					}
				});
			}
			if (!window.BDFDB_Global.pluginQueue.includes(this.name)) window.BDFDB_Global.pluginQueue.push(this.name);
		}
		start () {this.load();}
		stop () {}
		getSettingsPanel () {
			let template = document.createElement("template");
			template.innerHTML = `<div style="color: var(--header-primary); font-size: 16px; font-weight: 300; white-space: pre; line-height: 22px;">The Library Plugin needed for ${this.name} is missing.\nPlease click <a style="font-weight: 500;">Download Now</a> to install it.</div>`;
			template.content.firstElementChild.querySelector("a").addEventListener("click", this.downloadLibrary);
			return template.content.firstElementChild;
		}
	} : (([Plugin, BDFDB]) => {
		return class RemoveBlockedUsers extends Plugin {
			onLoad () {
				this.blockedNamesList = BdApi.Data.load("WebhookBlocker","blockednameslist");
				this.blockedNames = this.blockedNamesList.join("\n");
				this.settingsChanged = false;
				
				this.modulePatches = {
					before: ["Messages"],
				};
				this.patchPriority = 8;
			}
			
			maybeBlockMessage(message) {
				if (message?.author.discriminator == "0000" && this.blockedNamesList.includes(message?.author.username)) {
					if (!message.blocked) {
						message.blocked = true;
						return true;
					}
					else {return false;}
				}
				else {return false;}
			}

			onStart () {
				BDFDB.PatchUtils.patch(this, BDFDB.LibraryStores.ReadStateStore, "getUnreadCount", {after: e => {
					if (e.returnValue && e.returnValue < BDFDB.DiscordConstants.MAX_MESSAGES_PER_CHANNEL) {
						let sub = 0, messages = [].concat(BDFDB.LibraryStores.MessageStore.getMessages(e.methodArguments[0])._array).reverse();
						for (let i = 0; i < e.returnValue; i++) if (messages[i] && messages[i].blocked) sub++;
						e.returnValue -= sub;
					}
				}});
				
				BDFDB.PatchUtils.patch(this, BDFDB.LibraryStores.ReadStateStore, "hasUnread", {after: e => {
					if (e.returnValue && BDFDB.LibraryStores.ReadStateStore.getUnreadCount(e.methodArguments[0]) < BDFDB.DiscordConstants.MAX_MESSAGES_PER_CHANNEL) {
						let id = BDFDB.LibraryStores.ReadStateStore.lastMessageId(e.methodArguments[0]);
						let message = id && BDFDB.LibraryStores.MessageStore.getMessage(e.methodArguments[0], id);
						if (message?.blocked) {
							let oldestId = BDFDB.LibraryStores.ReadStateStore.getOldestUnreadMessageId(e.methodArguments[0]);
							let messages = BDFDB.LibraryStores.MessageStore.getMessages(e.methodArguments[0]);
							if (messages && oldestId) {
								let index = messages._array.indexOf(messages._array.find(c => c.id == oldestId));
								if (index > -1) return messages._array.slice(index).some(c => !c.blocked);
							}
						}
					}
				}});
				
				BDFDB.PatchUtils.patch(this, BDFDB.LibraryStores.GuildReadStateStore, "hasUnread", {after: e => {
					if (e.returnValue) return BDFDB.LibraryStores.GuildChannelStore.getChannels(e.methodArguments[0]).SELECTABLE.map(n => n.channel && n.channel.id).filter(n => n && n != "null").some(id => BDFDB.LibraryStores.ReadStateStore.hasUnread(id));
				}});
				
				BDFDB.DiscordUtils.rerenderAll();
			}
			
			onStop () {
				BDFDB.DiscordUtils.rerenderAll();
			}

			getSettingsPanel (collapseStates = {}) {
				let settingsPanel;
				return settingsPanel = BDFDB.PluginUtils.createSettingsPanel(this, {
					collapseStates: collapseStates,
					children: _ => {
						let settingsItems = [];						
						var newElement = BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormItem, {
								title: "Blocked names",
								plugin: this,
								children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextArea, {
									rows: 15,
									value: this.blockedNames,
									onChange: (value => {
										this.settingsChanged = true;
										this.blockedNames = value;
									})
								})
							});
						settingsItems.push(newElement);
						return settingsItems;
					}
				});
			}

			onSettingsClosed () {
				console.log(this.blockedNames);
				console.log(this.blockedNamesList);
				if (this.settingsChanged) {
					this.blockedNamesList = this.blockedNames ? this.blockedNames.split("\n") : [];
					BdApi.Data.save("WebhookBlocker", "blockednameslist", this.blockedNamesList);
					BDFDB.DiscordUtils.rerenderAll();
					this.settingsChanged = false;
				}
			}
		
			processMessages (e) {
				if (e.instance.props?.messages?._array.some(n => this.maybeBlockMessage(n))) {
					BDFDB.DiscordUtils.rerenderAll();
				}
			}
		};
	})(window.BDFDB_Global.PluginUtils.buildPlugin(changeLog));
})();