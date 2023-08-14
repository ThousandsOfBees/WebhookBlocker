# WebhookBlocker
A BetterDiscord plugin that allows you to block webhooks by name.

This plugin works by checking the usernames attached to messages posted by webhooks, comparing to a configurable list of usernames you want to block, and then marking any such messages as blocked, similar to how ordinary blocks work.

Usernames can be added via the settings option in the BetterDiscord plugin menu, or manually by editing the .config.json file. Usernames are separated by newlines.

If you wish to completely remove blocked messages, this plugin is compatible with the [RemoveBlockedUsers plugin](https://github.com/mwittrien/BetterDiscordAddons/tree/master/Plugins/RemoveBlockedUsers), which this plugin was based off.

This plugin was written by an amateur and may not work in all cases. Let us know what we should add or fix ^-^
