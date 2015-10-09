# CloudFlare TorBan

You run torban as a daemon, and it will sync your cloudflare firewall rules with the current list of tor exit nodes.

## Account requirements 

You must have room for the total amount of tor exit nodes, you can find out if you do by doing the math.

	Free zone: +200 firewall rule slots
	Pro zone: +1000 firewall rule slots

So if you have 5 free zones, and one Pro you have 2000 slots, I recomend at least having 2000 slots available.

## Installation

	npm install cloudflare-torban

edit and rename the config file to `default.json`

## Running

Requires node v4 or higher

	DEBUG=* npm run