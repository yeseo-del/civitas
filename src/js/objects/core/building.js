/**
 * Main Game building object.
 * 
 * @param {Object} params
 * @license GPLv3
 * @class civitas.objects.building
 * @returns {civitas.objects.building}
 */
civitas.objects.building = function(params) {

	/**
	 * The level of this building.
	 * 
	 * @type {Number}
	 * @private
	 */
	this.level = 1;

	/**
	 * Pointer to the settlement this building is located in.
	 * 
	 * @type {civitas.objects.settlement}
	 * @private
	 */
	this.settlement = null;

	/**
	 * The name of this building.
	 * 
	 * @type {String}
	 * @private
	 */
	this.name = null;

	/**
	 * The type of this building.
	 * 
	 * @type {String}
	 * @private
	 */
	this.type = null;

	/**
	 * Check if this building producing goods.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.stopped = false;

	/**
	 * Check if this is a production building.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.is_production = false;

	/**
	 * Check if this is a municipal building.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.is_municipal = false;

	/**
	 * Check if this is a housing building.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.is_housing = false;

	/**
	 * The DOM handle of this building.
	 *
	 * @type {String}
	 * @private
	 */
	this.handle = null;

	/**
	 * Flag if this building has any problems producing its goods.
	 *
	 * @type {Boolean}
	 * @private
	 */
	this.problems = false;

	/*
	 * The position of this building.
	 *
	 * @type {Object}
	 * @private
	 */
	this._position = null;

	/**
	 * Object constructor.
	 * 
	 * @private
	 * @constructor
	 * @returns {civitas.objects.building}
	 * @param {Object} params
	 */
	this.__init = function(params) {
		let self = this;
		this.settlement = params.settlement;
		this.type = params.type;
		this.name = params.data.name;
		this.is_production = (typeof params.data.production !== 'undefined') ? true : false;
		this.is_municipal = (typeof params.data.is_municipal !== 'undefined' && params.data.is_municipal === true) ? true : false;
		this.is_housing = (typeof params.data.tax !== 'undefined') ? true : false;
		this.level = (typeof params.data.level !== 'undefined') ? params.data.level : 1;
		this._position = (typeof params.data.position !== 'undefined') ? params.data.position : {
			x: 0,
			y: 0
		};
		this.stopped = (typeof params.stopped !== 'undefined') ? params.stopped : false;
		this.handle = params.data.handle;
		params.data.level = this.get_level();
		if (params.hidden !== true && this.settlement.is_player()) {
			$('section.game').append(self.core().ui().building_element(params)).on('click', '#building-' + this.get_handle(), function() {
				let panel = civitas['PANEL_' + self.get_handle().toUpperCase()];
				if (typeof panel !== 'undefined') {
					self.core().ui().open_panel(panel, params.data);
				} else {
					self.core().ui().open_panel(civitas.PANEL_BUILDING, params.data, true);
				}
				return false;
			});
			if (this.stopped === true) {
				this.notify(civitas.NOTIFICATION_PAUSED);
			} else {
				this.notify();
			}
			this.core().ui().refresh();
		}
		if (typeof params.data.storage !== 'undefined') {
			this.get_settlement().storage(this.get_settlement().storage().all + (params.data.storage * this.get_level()));
		}
		return this;
	};

	/**
	 * Check if the building can be upgraded.
	 *
	 * @returns {Boolean}
	 * @public
	 */
	this.is_upgradable = function() {
		const building = this.get_building_data();
		if (this.get_level() < building.levels) {
			return true;
		}
		return false;
	};

	/**
	 * Check if the building can be downgraded.
	 *
	 * @returns {Boolean}
	 * @public
	 */
	this.is_downgradable = function() {
		if (this.get_level() > 1) {
			return true;
		}
		return false;
	};

	/**
	 * Calculate the upgrade costs according to the next level.
	 *
	 * @public
	 * @returns {Object|Boolean}
	 */
	this.get_upgrade_costs = function() {
		if (this.is_upgradable()) {
			const next_level = this.get_level() + 1;
			const costs = {};
			const data = this.get_building_data(this.get_type());
			for (let item in data.cost) {
				costs[item] = data.cost[item] * next_level;
			}
			return costs;
		}
		return false;
	};

	/**
	 * Upgrade this building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.upgrade = function() {
		const core = this.core();
		const settlement = this.get_settlement();
		const next_level = this.get_level() + 1;
		let data = this.get_building_data(this.get_type());
		let building_image = this.get_type();
		const costs = this.get_upgrade_costs();
		if (data && this.is_upgradable() && settlement.is_building_built(this.get_type())) {
			if (costs && this.get_settlement().has_resources(costs)) {
				this.get_settlement().remove_resources(costs);
				this.set_level(next_level);
				if (settlement.is_player()) {
					if (this.get_type().slice(0, 5) === 'house') {
						building_image = this.get_type().slice(0, 5);
					}
					$('section.game .building[data-type=' + this.get_type() + ']').css({
						'background-image': 'url(' + civitas.ASSETS_URL + 'images/assets/buildings/' + ((typeof data.visible_upgrades === 'undefined' || data.visible_upgrades === false) ? building_image : building_image + this.get_level()) + '.png)'
					});
				}
				if (typeof data.storage !== 'undefined') {
					settlement.storage(settlement.storage().all + data.storage);
				}
				if (settlement.is_player()) {
					core.save_and_refresh();
					core.ui().notify(this.get_name() + ' upgraded to level ' + this.get_level());
				}
				return true;
			} else {
				if (settlement.is_player()) {
					core.ui().error('You don`t have enough resources to upgrade your ' + this.get_name() + '.');
				}
				return false;
			}
		}
		return false;
	};

	/**
	 * Downgrade this building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.downgrade = function() {
		const settlement = this.get_settlement();
		let data = this.get_building_data(this.get_type());
		let building_image = this.get_type();
		const next_level = this.get_level() - 1;
		if (data && this.is_downgradable() && settlement.is_building_built(this.get_type())) {
			this.set_level(next_level);
			if (settlement.is_player()) {
				if (this.get_type().slice(0, 5) === 'house') {
					building_image = this.get_type().slice(0, 5);
				}
				$('section.game .building[data-type=' + this.get_type() + ']').css({
					'background-image': 'url(' + civitas.ASSETS_URL + 'images/assets/buildings/' + ((typeof data.visible_upgrades === 'undefined' || data.visible_upgrades === false) ? building_image + '1' : building_image + this.get_level()) + '.png)'
				});
				if (typeof data.storage !== 'undefined') {
					settlement.storage(settlement.storage().all - data.storage);
				}
				this.core().save_and_refresh();
				this.core().ui().notify(this.get_name() + ' downgraded to level ' + this.get_level());
			}
			return true;
		}
		return false;
	};

	/**
	 * Check if this building is a housing building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_housing_building = function() {
		return this.is_housing;
	};

	/**
	 * Check if this building is a municipal building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_municipal_building = function() {
		return this.is_municipal;
	};

	/**
	 * Check if this building is a production building (its production can be
	 * started and stopped).
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_production_building = function() {
		return this.is_production;
	};

	/**
	 * Check if this building's production is started or stopped.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_stopped = function() {
		return this.stopped;
	};

	/**
	 * Start this building's production
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.start_production = function() {
		if (this.get_settlement().is_building_built(this.get_type()) &&
			this.is_production_building()) {
			if (this.get_settlement().is_player()) {
				this.core().ui().notify(this.get_name() + '`s production started.');
			}
			this.notify();
			this.stopped = false;
			this.core().save_and_refresh();
			return true;
		}
		return false;
	};

	/**
	 * Stop this building's production
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.stop_production = function() {
		if (this.get_settlement().is_building_built(this.get_type()) &&
			this.is_production_building()) {
			if (this.get_settlement().is_player()) {
				this.core().ui().notify(this.get_name() + '`s production stopped.');
			}
			this.notify(civitas.NOTIFICATION_PAUSED);
			this.stopped = true;
			this.core().save_and_refresh();
			return true;
		}
		return false;
	};

	/**
	 * Demolish this building and remove it from the DOM.
	 * 
	 * @public
	 * @param {Boolean} notify
	 * @returns {Boolean}
	 */
	this.demolish = function(notify) {
		const settlement = this.get_settlement();
		if (this.get_type() !== 'marketplace') {
			for (let i = 0; i < settlement.buildings.length; i++) {
				if (settlement.buildings[i].get_type() === this.get_type()) {
					settlement.buildings.splice(i, 1);
				}
			}
			if (settlement.is_player()) {
				$('section.game > .building[data-type=' + this.get_type() + ']').remove();
				if (notify === true) {
					this.core().ui().notify(this.get_name() + ' demolished successfully!');
				}
			}
			return true;
		} else {
			if (settlement.is_player()) {
				if (notify === true) {
					this.core().ui().error('Unable to demolish the specified building `' + this.get_name() + '`!');
				}
			}
			return false;
		}
	};

	/**
	 * Get building data from the main configuration array.
	 * 
	 * @public
	 * @returns {Object}
	 */
	this.get_building_data = function(type) {
		if (typeof type === 'undefined') {
			type = this.type;
		}
		return this.core().get_building_config_data(type);
	};

	/**
	 * Get the settlement resources object
	 * 
	 * @public
	 * @returns {Object}
	 */
	this.get_settlement_resources = function() {
		return this.get_settlement().get_resources();
	};

	/**
	 * Check if this building has all the buildings requirements.
	 *
	 * @public
	 * @returns {Boolean}
	 */
	this.has_building_requirements = function() {
		let good = true;
		let parent;
		const building = this.get_building_data();
		if (typeof building.requires.buildings !== 'undefined') {
			const required = building.requires.buildings;
			for (let item in required) {
				if (this.get_settlement().is_building_built(item, required[item])) {
					parent = this.get_settlement().get_building(item);
					if (parent && !parent.is_stopped()) {
						good = parent.has_building_requirements() && parent.has_settlement_requirements()
						if (good === false) {
							return false;
						}
					} else {
						return false;
					}
				}
			}
		}
		return good;
	};

	/**
	 * Check if this building has all the research requirements.
	 *
	 * @public
	 * @returns {Boolean}
	 */
	this.has_research_requirements = function() {
		const building = this.get_building_data();
		if (typeof building.requires.research !== 'undefined') {
			if (!this.core().has_research(building.requires.research)) {
				return false;
			}
		}
		return true;
	};

	/**
	 * Check if this building has all the settlement level requirements.
	 *
	 * @public
	 * @returns {Boolean}
	 */
	this.has_settlement_requirements = function() {
		const building = this.get_building_data();
		if (typeof building.requires.settlement_level !== 'undefined') {
			if (building.requires.settlement_level > this.get_settlement().level()) {
				return false;
			}
		}
		return true;
	};

	/**
	 * Check if this building has all the requirements.
	 *
	 * @public
	 * @returns {Boolean}
	 */
	this.has_requirements = function() {
		return this.has_building_requirements() && this.has_settlement_requirements() && this.has_research_requirements();
	};

	/**
	 * Tax this building.
	 *
	 * @public
	 * @param {Number} amount
	 * @returns {Boolean}
	 */
	this.tax = function(amount) {
		let _amount = this.get_tax_amount(amount);
		this.get_settlement().inc_coins(_amount);
		return this;
	};

	/**
	 * Return the amount of taxation based on the settlement research.
	 *
	 * @public
	 * @param {Number}
	 * @returns {Number}
	 */
	this.get_tax_amount = function(amount) {
		return amount * this.get_level() + this.core().get_tax_modifier(this.get_handle());
	};

	/**
	 * Produce the resources.
	 *
	 * @public
	 * @param {Object} materials
	 * @returns {Boolean}
	 */
	this.produce = function(materials) {
		if (!this.get_settlement().has_storage_space_for(materials)) {
			return false;
		}
		const settlement = this.get_settlement();
		let chance;
		let amount;
		const building = this.get_building_data();
		let random_amount;
		for (let item in materials) {
			amount = materials[item] * this.get_level();
			if (item === 'faith') {
				settlement.raise_faith(amount);
			} else if (item === 'research') {
				settlement.raise_research(amount);
			} else if (item === 'espionage') {
				settlement.raise_espionage(amount);
			} else if (item === 'fame') {
				settlement.raise_fame(amount);
			} else if (item === 'prestige') {
				settlement.raise_prestige(amount);
			} else {
				amount += this.core().get_prod_modifier(building);
				settlement.add_to_storage(item, amount);
				if (typeof building.chance !== 'undefined') {
					for (let itemo in building.chance) {
						chance = Math.random();
						if ((chance * this.get_level()) < building.chance[itemo]) {
							random_amount = civitas.utils.get_random(1, 5);
							settlement.add_to_storage(itemo, random_amount);
						}
					}
				}
			}
		}
		return true;
	};

	/**
	 * Main threading method for the building, this does the actual processing each turn.
	 * 
	 * @public
	 * @returns {civitas.objects.building}
	 */
	this.process = function() {
		const building = this.get_building_data();
		const materials = building.materials;
		const settlement = this.get_settlement();
		if (this.is_housing_building()) {
			if (typeof materials !== 'undefined') {
				if (settlement.has_resources(materials)) {
					settlement.remove_resources(materials);
					this.tax(building.tax);
					this.log_to_console();
				} else {
					this.notify(civitas.NOTIFICATION_MISSING_RES);
					return false;
				}
			}
		} else if (this.is_production_building()) {
			if (!this.is_stopped()) {
				let products = building.production;
				if (this.has_requirements()) {
					if (typeof materials !== 'undefined') {
						if (Array.isArray(materials)) {
							let all_good = true;
							let removable = {};
							for (let i = 0; i < materials.length; i++) {
								let res = settlement.has_any_resources(materials[i]);
								if (res !== false) {
									removable[res] = materials[i][res];
								} else {
									all_good = false;
								}
							}
							if (all_good === true) {
								if (settlement.has_storage_space_for(products)) {
									settlement.remove_resources(removable);
									if (this.produce(products)) {
										this.log_to_console();
									}
								} else {
									this.core().ui().log('game', 'There is no storage space in ' + settlement.name() + ' to accomodate the new goods.', true);
									this.problems = true;
									return false;
								}
							} else {
								this.notify(civitas.NOTIFICATION_MISSING_RES);
								this.problems = true;
								return false;
							}
						} else {
							if (settlement.has_resources(materials)) {
								if (settlement.has_storage_space_for(products)) {
									settlement.remove_resources(materials);
									if (this.produce(products)) {
										this.log_to_console();
									}
								} else {
									this.core().ui().log('game', 'There is no storage space in ' + settlement.name() + ' to accomodate the new goods.', true);
									this.problems = true;
									return false;
								}
							} else {
								this.notify(civitas.NOTIFICATION_MISSING_RES);
								return false;
							}
						}
					} else {
						if (settlement.has_storage_space_for(products)) {
							if (this.produce(products)) {
								this.log_to_console();
							}
						} else {
							this.core().ui().log('game', 'There is no storage space in ' + settlement.name() + ' to accomodate the new goods.', true);
							this.problems = true;
							return false;
						}
					}
				} else {
					this.notify(civitas.NOTIFICATION_MISSING_REQ);
					return false;
				}
			} else {
				this.notify(civitas.NOTIFICATION_PAUSED);
				return false;
			}
		}
		return true;
	};

	/**
	 * Check if this building is the marketplace.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_marketplace = function() {
		if (this.get_type() === 'marketplace') {
			return true;
		}
		return false;
	};

	/**
	 * Get the settlement this building is located into
	 * 
	 * @public
	 * @returns {civitas.objects.settlement}
	 */
	this.get_settlement = function() {
		return this.settlement;
	};

	/**
	 * Get a pointer to the game core
	 * 
	 * @public
	 * @returns {civitas.game}
	 */
	this.core = function() {
		return this.get_settlement().core();
	};

	/**
	 * Get the name of this building
	 * 
	 * @public
	 * @returns {String}
	 */
	this.get_name = function() {
		return this.name;
	};

	/**
	 * Check whether this building has problems producing its goods.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.has_problems = function() {
		return this.problems;
	};

	/**
	 * Set the level of this building
	 * 
	 * @public
	 * @param {Number} value
	 * @returns {civitas.objects.building}
	 */
	this.set_level = function(value) {
		this.level = value;
		return this;
	};

	/**
	 * Get the level of this building
	 * 
	 * @public
	 * @returns {Number}
	 */
	this.get_level = function() {
		return this.level;
	};

	/**
	 * Get the type of this building
	 * 
	 * @public
	 * @returns {String}
	 */
	this.get_type = function() {
		return this.type;
	};

	/**
	 * Return the DOM handle of this building.
	 *
	 * @public
	 * @returns {String}
	 */
	this.get_handle = function() {
		return this.handle;
	};

	/**
	 * Log production data to the game console.
	 *
	 * @public
	 * @returns {civitas.objects.building}
	 */
	this.log_to_console = function() {
		this.notify();
		const building = this.get_building_data();
		let _p = '';
		let _m = '';
		if (typeof building.production !== 'undefined') {
			for (let item in building.production) {
				_p += (building.production[item] * this.get_level() + this.core().get_prod_modifier(building)) + ' ' + item + ', ';
			}
			_p = _p.substring(0, _p.length - 2);
		}
		if (typeof building.materials !== 'undefined') {
			if (Array.isArray(building.materials)) {
				const removable = {};
				for (let i = 0; i < building.materials.length; i++) {
					const res = this.get_settlement().has_any_resources(building.materials[i]);
					if (res !== false) {
						removable[res] = building.materials[i][res];
					}
				}
				for (let item in removable) {
					_m += removable[item] + ' ' + item + ', ';
				}
				_m = _m.substring(0, _m.length - 2);
			} else {
				for (let item in building.materials) {
					_m += building.materials[item] + ' ' + item + ', ';
				}
				_m = _m.substring(0, _m.length - 2);
			}
		}
		if (typeof building.tax !== 'undefined') {
			this.core().ui().log('game', this.get_name() + ' used ' + _m + ' and got taxed for ' + this.get_tax_amount(building.tax) + ' coins.');
		} else if (typeof building.production !== 'undefined' && typeof building.materials === 'undefined') {
			this.core().ui().log('game', this.get_name() + ' produced ' + _p + '.');
		} else {
			this.core().ui().log('game', this.get_name() + ' used ' + _m + ' and produced ' + _p + '.');
		}
		return this;
	};

	/**
	 * Perform building notifications.
	 *
	 * @public
	 * @param {Number} notification_type
	 * @returns {civitas.objects.building}
	 */
	this.notify = function(notification_type) {
		if (typeof notification_type !== 'undefined') {
			this.problems = true;
			if (this.get_settlement().is_player()) {
				let handle = $('section.game > #building-' + this.get_handle());
				switch (notification_type) {
					case civitas.NOTIFICATION_MISSING_REQ:
						this.core().ui().log('game', this.get_name() + ' doesn`t have one of the buildings required to be operational.', true);
						handle.empty().append('<span class="notification requirements"></span>');
						break;
					case civitas.NOTIFICATION_PAUSED:
						this.core().ui().log('game', this.get_name() + '`s production is stopped.', true);
						handle.empty().append('<span class="notification paused"></span>');
						break;
					case civitas.NOTIFICATION_SETTLEMENT_LOW_LEVEL:
						this.core().ui().log('game', 'Your settlement level is too low for ' + this.get_name() + ' to be active.', true);
						handle.empty().append('<span class="notification lowlevel"></span>');
						break;
					case civitas.NOTIFICATION_MISSING_RES:
					default:
						this.core().ui().log('game', this.get_name() + ' is missing materials for production.', true);
						handle.empty().append('<span class="notification error"></span>');
						break;
				}
			}
		} else {
			this.problems = false;
			if (this.get_settlement().is_player()) {
				$('section.game > #building-' + this.get_handle()).empty();
			}
		}
		return this;
	};

	/**
	 * Get the city position of this building.
	 *
	 * @public
	 * @returns {Object}
	 */
	this.position = function() {
		return this._position;
	};

	// Fire up the constructor
	return this.__init(params);
};
