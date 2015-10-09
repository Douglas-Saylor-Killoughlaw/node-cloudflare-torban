var Promise = require('bluebird'),
	PromiseObject = require('promise-object')(Promise),
	request = require('request-promise'),
	debug = require('debug')('cloudflare-torban'),
	config = require('config'),
	CloudflareAPI = require('cloudflare4'),
	api = new CloudflareAPI({
		key: config.key,
		email: config.email,
		autoPagination: true
	});

var TorBan = PromiseObject.create({
	initialize: function () {
		this.interval = 15 * 1000;
		this.nodes = [];
		this.running = false;
		this.stopping = false;
	},

	start: function *($deferred) {
		this.running = true;

		// get initial IP's
		(yield api.userFirewallAccessRuleGetAll()).forEach(function (rule) {
			if (rule.configuration.target === 'ip' && rule.notes === 'tor') {
				this.nodes.push(rule.configuration.value);
			}
		}, this);

		while (this.stopping == false) {
			yield this.update();

			debug('delaying ' + this.interval + 'ms until next check');
			yield Promise.delay(this.interval);
		}

		this.running = false;

		$deferred.resolve();
	},

	// stop: function *($deferred) {
	// 	this.stopping = true;

	// 	while (this.running) {
	// 		yield Promise.delay(1000);
	// 	}

	// 	$deferred.resolve();
	// },

	add: function *($deferred, ip) {
		debug('adding ' + ip + ' to cloudflares ban list');
		
		this.nodes.push(ip);

		$deferred.resolve(yield api.userFirewallAccessRuleNew({
			mode: 'block',
			notes: 'tor',
			configuration: {
				target: 'ip',
				value: ip
			}
		}));
	},
	
	remove: function *($deferred, ip) {
		debug('removing ' + ip + ' from cloudflares ban list');

		var rules = yield api.userFirewallAccessRuleGetAll({
			configuration_target: 'ip',
			configuration_value: ip
		});

		if (rules.length) {
			yield api.userFirewallAccessRuleDestroy(rules[0].id);
		}
		
		this.nodes = this.nodes.filter(function (item) {
			return ip != item;
		});

		$deferred.resolve();
	},

	update: function *($deferred) {
		var data = yield request.get({url: 'https://check.torproject.org/exit-addresses'});

		var ips = data.match(/ExitAddress (\d+)\.(\d+)\.(\d+)\.(\d+)/gi);

		var i;

		if (ips) {
			ips = ips.map(function (ip) {
				return ip.replace('ExitAddress ', '');
			});

			for (i = 0; i < this.nodes.length; i++) {
				if (ips.indexOf(this.nodes[i]) === -1) {
					yield this.remove(this.nodes[i]);
				}
			}

			for (i = 0; i < ips.length; i++) {
				if (this.nodes.indexOf(ips[i]) === -1) {
					yield this.add(ips[i]);
				}
			}
		}

		$deferred.resolve();
	}
});

var torNodes = new TorBan();
torNodes.start();