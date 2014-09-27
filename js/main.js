(function()
{
	'use strict';

	/**
	 * Copy an object onto a new one
	 * @param {Object} newObj The new or already existing object
	 * @param {Object} oldObj The old object to copy
	 * @param {Boolean} [deep=false] Whether to copy object keys and to follow other objects
	 * @returns {Object} newObj
	 */
	function copyObj(newObj, oldObj, deep)
	{
		var keys = Object.keys(oldObj);

		if (deep)
		{
			for (var i = 0; i < keys.length; i++)
			{
				newObj[keys[i]] = typeof oldObj[keys[i]] === 'object'
					? copyObj({}, oldObj[keys[i]], true)
					: oldObj[keys[i]];
			}
		}
		else
		{
			for (var i = 0; i < keys.length; i++)
			{
				newObj[keys[i]] = oldObj[keys[i]];
			}
		}

		return newObj;
	}

	/**
	 * Convert polar coords to cartesian coords
	 * @param {Number} radius
	 * @param {Number} angle
	 * @returns {[Number, Number]} 0 is x, 1 is y
	 */
	function polar2cart(radius, angle)
	{
		return [
			radius * Math.cos(angle),
			radius * Math.sin(angle)
		];
	}

	/**
	 * Convert a byte to base 16
	 * @param {Number} n
	 * @returns {string}
	 */
	function byte2Hex(n)
	{
		var nybHexString = "0123456789ABCDEF";
		return String(nybHexString.substr((n >> 4) & 0x0F, 1)) + nybHexString.substr(n & 0x0F, 1);
	}

	/**
	 * Convert a RGB color representation to a hex color representation
	 * @param {Number} r
	 * @param {Number} g
	 * @param {Number} b
	 * @returns {string}
	 * @constructor
	 */
	function RGB2Color(r, g, b)
	{
		return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
	}

	/**
	 * The object container for the disks that animate
	 * @param {Number} radius Radius of disk
	 * @param {[Number, Number]} xy cartesian coords of disk
	 * @constructor
	 */
	function Disk(radius, xy)
	{
		this.disk = document.createElement('div');
		this.disk.className = 'disk';

		this.setParams(radius, xy);
	}

	/**
	 * Set the radius and cartesian coords of the disk
	 * @param {Number} radius
	 * @param {Number} xy
	 * @returns {Disk}
	 */
	Disk.prototype.setParams = function(radius, xy)
	{
		this.disk.style.width = (radius * 2) + 'px';
		this.disk.style.height = (radius * 2) + 'px';
		this.disk.style.left = (xy[0] === radius ? 0 : (xy[0] - radius)) + 'px';
		this.disk.style.top = (xy[1] === radius ? 0 : (xy[1] - radius)) + 'px';

		return this;
	};

	/**
	 * CSS styles that apply to the animated disks
	 * @type {{backgroundColor: string, borderColor: string}}
	 */
	var diskStyles =
	{
		backgroundColor : '#FFFFFF',
		borderColor     : '#000000'
	};

	/**
	 * Run-time options that apply to the disks
	 * @type {{opacity: boolean, running: boolean, width: number}}
	 */
	var diskOptions =
	{
		opacity : false,
		running : true,
		width   : 400
	};

	/**
	 * Run-time options that alter the behavior of the animation
	 * @type {{duration: number, fps: number, ndisks_per_cycle: number, speed: number, frameRate: number, chillInterval: number}}
	 */
	var runOptions =
	{
		duration         : 2.0,
		fps              : 20,
		ndisks_per_cycle : 8,
		speed            : 0.05,
		frameRate        : 40.0, // duration * fps
		chillInterval    : undefined
	};

	/**
	 * Update the application stylesheet with the diskStyles rules
	 */
	var updateStylesheet = (function bootstrapStylesheet()
	{
		var stylesheet = document.getElementById('application-stylesheet').sheet;

		function insertRules()
		{
			stylesheet.insertRule('.disk {\
				background-color: ' + diskStyles.backgroundColor + ';\
				border-color: ' + diskStyles.borderColor + ';\
			}', stylesheet.rules.length);
		}

		insertRules();

		return function()
		{
			// overwrite the last rule entered
			stylesheet.removeRule(stylesheet.rules.length - 1);
			insertRules();
		};
	})();

	/**
	 * Bootstrap the animation application and get the method with which to draw a new frame
	 * @param {Number} t The current frame
	 */
	var makeFrameMethod = (function bootstrap()
	{
		var edgeContainer = document.getElementById('container'),
			centeringElem = document.createElement('div');

		centeringElem.className = 'center';

		var circle1 = new Disk(0.65 * diskOptions.width, [0.65 * diskOptions.width, 0.65 * diskOptions.width]),
			circle2 = new Disk(0.42 * diskOptions.width, [0.42 * diskOptions.width, 0.42 * diskOptions.width]);

		circle1.disk.id = 'circle1';
		circle2.disk.id = 'circle2';
		circle1.disk.className = '';
		circle2.disk.className = '';

		circle2.disk.appendChild(centeringElem);
		circle1.disk.appendChild(circle2.disk);
		edgeContainer.appendChild(circle1.disk);

		var delay_between_disks = 1.0 * runOptions.duration / 2 / runOptions.ndisks_per_cycle,
			total_number_of_disks = parseInt(runOptions.ndisks_per_cycle / runOptions.speed, 10),
			start = 1.0 / runOptions.speed;

		var disks = [];
		for (var i = 0; i < total_number_of_disks; i++)
		{
			disks.push(new Disk(0, [0, 0]));
			centeringElem.appendChild(disks[i].disk);
		}

		function make_frame(t)
		{
			var angle, radius, cartCoords, color, circle;

			for (var i = 0; i < total_number_of_disks; i++)
			{
				angle = (Math.PI / runOptions.ndisks_per_cycle) * (total_number_of_disks - i - 1);
				radius = Math.max(0, 0.05 * (t + start - delay_between_disks * (total_number_of_disks - i - 1)));

				cartCoords = polar2cart(radius, angle);
				cartCoords[0] = (cartCoords[0] + 0.5) * diskOptions.width;
				cartCoords[1] = (cartCoords[1] + 0.5) * diskOptions.width;

				color = ((i / runOptions.ndisks_per_cycle) % 1.0);

				circle = disks[i].setParams(0.3 * diskOptions.width, cartCoords).disk;

				//circle.style.borderColor = diskStyles.borderColor;
				//circle.style.backgroundColor = diskStyles.backgroundColor;
				circle.style.opacity = diskOptions.opacity ? color : 1;
			}
		}

		return make_frame;
	})();

	/**
	 * Start the application loop.
	 * @param {Function} make_frame The method returned from bootstrap().
	 */
	function run(make_frame)
	{
		if (run.interval)
		{
			window.clearInterval(run.interval);
		}

		run.t = run.t || 0;
		run.interval = window.setInterval(function()
		{
			if (!diskOptions.running)
			{
				return;
			}

			var frame = run.t / runOptions.fps;
			if (run.t === runOptions.frameRate)
			{
				run.t = 0;
			}

			make_frame(frame);

			run.t++;
		}, runOptions.frameRate);
	}

	/**
	 * Bootstrap the options dialog
	 */
	(function bootstrapOptions()
	{
		var toggles = document.getElementsByTagName('input'),
			options = document.getElementById('options'),
			hideOptions = document.getElementById('hide-options'),
			showOptions = document.getElementById('show-options');

		hideOptions.addEventListener('click', function(e)
		{
			e.preventDefault();
			options.className = 'hide';
		});

		showOptions.addEventListener('click', function(e)
		{
			e.preventDefault();
			options.className = options.className.replace('hide', '');
		});

		/* #region checkboxes */
		toggles.opacity.addEventListener('change', function()
		{
			diskOptions.opacity = this.checked;
		});

		toggles.running.addEventListener('change', function()
		{
			diskOptions.running = this.checked;
		});

		/**
		 * Generate colors and enjoy the experience
		 */
		toggles.chill.addEventListener('change', function()
		{
			if (runOptions.chillInterval)
			{
				window.clearInterval(runOptions.chillInterval);
				runOptions.chillInterval = undefined;
			}

			if (this.checked === false)
			{
				return;
			}

			var i = 0;
			runOptions.chillInterval = window.setInterval(function()
			{
				if (i === 255)
				{
					i = 0;
				}

				// good reference on this: http://krazydad.com/tutorials/makecolors.php
				var phaseShiftRed = 0,
					phaseShiftGreen = 2 * Math.PI / 3,
					phaseShiftBlue = 4 * Math.PI / 3;

				var r = Math.sin(0.01 * i + phaseShiftRed) * 128 + 127,
					g = Math.sin(0.01 * i + phaseShiftGreen) * 128 + 127,
					b = Math.sin(0.01 * i + phaseShiftBlue) * 128 + 127,
					bgHexValue = RGB2Color(r, g, b),
					borderHexValue = RGB2Color(255 - r, 255 - g, 255 - b); // border is the inverse of the bg

				toggles.colorbg.jscolor.fromString(bgHexValue);
				toggles.colorborder.jscolor.fromString(borderHexValue);
				diskStyles.backgroundColor = bgHexValue;
				diskStyles.borderColor = borderHexValue;
				updateStylesheet();

				i++;
			}, 1000);
		});
		/* #endregion */

		/* #region inverse checkbox and color inputs */
		toggles.inverse.addEventListener('change', function(e)
		{
			var temp = diskStyles.backgroundColor;
			diskStyles.backgroundColor = diskStyles.borderColor;
			diskStyles.borderColor = temp;

			toggles.colorbg.jscolor.fromString(diskStyles.backgroundColor);
			toggles.colorborder.jscolor.fromString(diskStyles.borderColor);
		});

		jscolor.init();
		toggles.colorbg.jscolor = new jscolor.color(toggles.colorbg,
			{
				hash              : true,
				onImmediateChange : function()
				{
					diskStyles.backgroundColor = this.valueElement.value;
					updateStylesheet();
				}
			});

		toggles.colorborder.jscolor = new jscolor.color(toggles.colorborder,
			{
				hash              : true,
				onImmediateChange : function()
				{
					diskStyles.borderColor = this.valueElement.value;
					updateStylesheet();
				}
			});
		/* #endregion */

		/* #region sliders */
		toggles.width.addEventListener('input', function()
		{
			diskOptions.width = this.value;
		});
		/* #endregion */

		/* #region FPS slider and reverse toggle */
		toggles.fps.addEventListener('input', function()
		{
			toggles.reverse.checked = this.value < 0;

			runOptions.fps = this.value;
			run(makeFrameMethod);
		});

		toggles.reverse.addEventListener('change', function()
		{
			if (this.checked && runOptions.fps < 0) return;

			runOptions.fps = runOptions.fps * -1;
			toggles.fps.value = runOptions.fps;
		});
		/* #endregion */

		/* #region buttons */
		var buttons = document.getElementsByTagName('button');
		var defaults =
		{
			diskStyles  : copyObj({}, diskStyles),
			diskOptions : copyObj({}, diskOptions),
			runOptions  : copyObj({}, runOptions),
			formOptions : {}
		};
		Array.prototype.forEach.call(toggles, function(e)
		{
			defaults.formOptions[e.name] = e.type === 'checkbox' ? e.checked : e.value;
		});

		buttons.reset.addEventListener('click', function()
		{
			copyObj(diskStyles, defaults.diskStyles);
			copyObj(diskOptions, defaults.diskOptions);
			copyObj(runOptions, defaults.runOptions);

			Array.prototype.forEach.call(toggles, function(e)
			{
				if (e.type === 'checkbox')
				{
					e.checked = defaults.formOptions[e.name];
				}
				else
				{
					e.value = defaults.formOptions[e.name];
				}
			});
		});

		buttons.fullscreen.addEventListener('click', function()
		{
			var elem = document.getElementById('container');
			if (elem.requestFullscreen)
			{
				elem.requestFullscreen();
			} else if (elem.msRequestFullscreen)
			{
				elem.msRequestFullscreen();
			} else if (elem.mozRequestFullScreen)
			{
				elem.mozRequestFullScreen();
			} else if (elem.webkitRequestFullscreen)
			{
				elem.webkitRequestFullscreen();
			}
		});
		/* #endregion */
	})();

	run(makeFrameMethod);
})();