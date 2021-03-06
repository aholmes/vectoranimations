domContentLoaded = function ()
{
	'use strict';

	if (typeof jscolor === 'undefined')
	{
		var scripts = document.getElementsByTagName('script'), lastScript = scripts[scripts.length - 1];
		var s = document.createElement('script');
		s.src = 'js/vendor/jscolor/jscolor.js';
		lastScript.parentNode.insertBefore(s, lastScript.nextSibling);
		s.onload = s.onreadystatechange = domContentLoaded;
		return;
	}

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
	 */
	function RGB2Color(r, g, b)
	{
		return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
	}

	/**
	 * Get the base-10 representation of a hex string
	 * @param {String} hex
	 * @returns {Number}
	 */
	function Hex2Num(hex)
	{
		return parseInt(hex.replace(/^#/, ''), 16);
	}

	/**
	 * CSS styles that apply to the animated disks
	 * @type {{backgroundColor: string, borderColor: string}}
	 */
	var diskStyles =
	{
		backgroundColor : '#FFFFFF',
		borderColor     : '#000000',
		opacity         : 1,
		stroke          : 5
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
	 * @type {{duration: number, fps: number, ndisks_per_cycle: number, speed: number, frameRate: number, chillInterval: number|undefined, mode: string}}
	 */
	var runOptions =
	{
		duration         : 2.0,
		fps              : 20,
		ndisks_per_cycle : 8,
		speed            : 0.05,
		frameRate        : 40.0, // duration * fps
		chillInterval    : undefined,
		mode             : 'canvas' // can be 'dom' or 'canvas'
	};

	var runModeHelpers = {}, getGraphics;

	if (runOptions.mode === 'canvas')
	{
		getGraphics = function ()
		{
			return new PIXI.Graphics()
				.beginFill(Hex2Num(diskStyles.backgroundColor), diskStyles.opacity)
				.lineStyle(diskStyles.stroke, Hex2Num(diskStyles.borderColor), diskStyles.opacity);
		};

		runModeHelpers.Graphics = getGraphics();

		runModeHelpers.Reset = function ()
		{
			runModeHelpers.Stage.removeChild(runModeHelpers.Graphics);
			runModeHelpers.Graphics.clear();
			runModeHelpers.Graphics = getGraphics();
			runModeHelpers.Stage.addChild(runModeHelpers.Graphics);
		};

		runModeHelpers.Stage = new PIXI.Stage(0x000000);
		runModeHelpers.Stage.addChild(runModeHelpers.Graphics);

		runModeHelpers.Renderer = undefined;
	}

	/**
	 * The object container for the disks that animate
	 * @param {Number} radius Radius of disk
	 * @param {[Number, Number]} xy cartesian coords of disk
	 * @constructor
	 */
	function Disk(radius, xy)
	{
		if (runOptions.mode === 'dom')
		{
			this.disk = document.createElement('div');
			this.disk.className = 'disk';

			this.setParams(radius, xy);
		}
		else
		{
			this.disk = runModeHelpers.Graphics;

			this.disk.drawCircle(
				xy[0],
				xy[1],
				radius
			);
		}
	}

	/**
	 * Set the radius and cartesian coords of the disk
	 * @param {Number} radius
	 * @param {Number} xy
	 * @returns {Disk}
	 */
	Disk.prototype.setParams = runOptions.mode === 'dom'
		? function (radius, xy)
	{
		this.disk.style.width = (radius * 2) + 'px';
		this.disk.style.height = (radius * 2) + 'px';
		this.disk.style.left = (xy[0] === radius ? 0 : (xy[0] - radius)) + 'px';
		this.disk.style.top = (xy[1] === radius ? 0 : (xy[1] - radius)) + 'px';

		return this;
	}
		: function (radius, xy)
	{
		return this;
	};

	/**
	 * Update the application stylesheet with the diskStyles rules
	 */
	var updateStylesheet = (function bootstrapStylesheet()
	{
		if (runOptions.mode !== 'dom')
		{
			return function ()
			{
			};
		}

		var stylesheet = document.getElementById('application-stylesheet').sheet;

		function insertRules()
		{
			stylesheet.insertRule('.disk {\
				background-color: ' + diskStyles.backgroundColor + ';\
				border-color: ' + diskStyles.borderColor + ';\
			}', stylesheet.cssRules.length);
		}

		insertRules();

		return function ()
		{
			// overwrite the last rule entered
			stylesheet.deleteRule(stylesheet.cssRules.length - 1);
			insertRules();
		};
	})();

	/**
	 * Bootstrap the animation application and get the method with which to draw a new frame
	 * @param {Number} t The current frame
	 */
	var makeFrameMethod = (function bootstrap()
	{
		var delay_between_disks = runOptions.duration / 2 / runOptions.ndisks_per_cycle,
			total_number_of_disks = parseInt(runOptions.ndisks_per_cycle / runOptions.speed, 10),
			start = 1.0 / runOptions.speed;

		var container = document.getElementById('container');

		if (runOptions.mode === 'dom')
		{
			var circle1 = new Disk(0.65 * diskOptions.width, [0.65 * diskOptions.width, 0.65 * diskOptions.width]),
				circle2 = new Disk(0.42 * diskOptions.width, [0.42 * diskOptions.width, 0.42 * diskOptions.width]);

			circle1.disk.id = 'circle1';
			circle2.disk.id = 'circle2';
			circle1.disk.className = '';
			circle2.disk.className = '';

			circle1.disk.appendChild(circle2.disk);
			container.appendChild(circle1.disk);

			var disks = [];
			for (var i = 0; i < total_number_of_disks; i++)
			{
				disks.push(new Disk(0, [0, 0]));
				circle2.disk.appendChild(disks[i].disk);
			}
		}
		else
		{
			runModeHelpers.Renderer = new PIXI.autoDetectRenderer(
				0.42 * diskOptions.width * 2,
				0.42 * diskOptions.width * 2,
				null, // view
				false, // transparent
				true // antialias
			);
			runModeHelpers.Renderer.view.id = 'canvas';
			container.appendChild(runModeHelpers.Renderer.view);

			runModeHelpers.Renderer.render(runModeHelpers.Stage);
		}

		var make_frame = runOptions.mode === 'dom'
			? function (t)
		{
			var angle, radius, cartCoords, color, circle;

			for (var i = 0; i < total_number_of_disks; i++)
			{
				angle = (Math.PI / runOptions.ndisks_per_cycle) * (total_number_of_disks - i - 1);
				radius = Math.max(0, 0.05 * (t + start - delay_between_disks * (total_number_of_disks - i - 1)));

				cartCoords = polar2cart(radius, angle);
				cartCoords[0] = (cartCoords[0] + 0.5) * parseInt(circle2.disk.style.width, 10);
				cartCoords[1] = (cartCoords[1] + 0.5) * parseInt(circle2.disk.style.height, 10);

				color = ((i / runOptions.ndisks_per_cycle) % 1.0);

				circle = disks[i].setParams(0.3 * diskOptions.width, cartCoords, i).disk;

				circle.style.opacity = diskOptions.opacity ? color : 1;
			}
		}
			: function (t)
		{
			var angle, radius, cartCoords, color;

			runModeHelpers.Reset();

			for (var i = 0; i < total_number_of_disks; i++)
			{
				angle = (Math.PI / runOptions.ndisks_per_cycle) * (total_number_of_disks - i - 1);
				radius = Math.max(0, 0.05 * (t + start - delay_between_disks * (total_number_of_disks - i - 1)));

				cartCoords = polar2cart(radius, angle);
				cartCoords[0] = (cartCoords[0] + 0.5) * runModeHelpers.Renderer.width;
				cartCoords[1] = (cartCoords[1] + 0.5) * runModeHelpers.Renderer.height;

				if (diskOptions.opacity)
				{
					color = ((i / runOptions.ndisks_per_cycle) % 1.0);

					runModeHelpers.Graphics
						.endFill()
						.beginFill(Hex2Num(diskStyles.backgroundColor), color)
						.lineStyle(diskStyles.stroke, Hex2Num(diskStyles.borderColor), color);
				}

				new Disk(0.3 * diskOptions.width, cartCoords);
			}

			runModeHelpers.Renderer.render(runModeHelpers.Stage);
		}

		return make_frame;
	})();

	/**
	 * Start the application loop.
	 * @param {Function} make_frame The method returned from bootstrap().
	 */
	function run()
	{
		run.t = run.t || 0;

		var frame = run.t / runOptions.fps;
		if (run.t === runOptions.frameRate)
		{
			run.t = 0;
		}

		run.make_frame(frame);

		// continue painting new frames when not running, but don't animate the disks
		// this way, chill mode, with, and opacity can be changed when the frames are "still."
		if (diskOptions.running)
		{
			run.t++;
		}

		requestAnimFrame(run);
	}

	run.make_frame = makeFrameMethod;

	/**
	 * Bootstrap the options dialog
	 */
	(function bootstrapOptions()
	{
		var toggles = document.getElementsByTagName('input'),
			options = document.getElementById('options'),
			hideOptions = document.getElementById('hide-options'),
			showOptions = document.getElementById('show-options');

		hideOptions.addEventListener('click', function (e)
		{
			e.preventDefault();
			options.className = 'hide';
		});

		showOptions.addEventListener('click', function (e)
		{
			e.preventDefault();
			options.className = options.className.replace('hide', '');
		});

		/* #region checkboxes */
		toggles.opacity.addEventListener('change', function ()
		{
			diskOptions.opacity = this.checked;
		});

		toggles.running.addEventListener('change', function ()
		{
			diskOptions.running = this.checked;
		});

		/**
		 * Generate colors and enjoy the experience
		 */
		toggles.chill.addEventListener('change', function ()
		{
			var self = this;

			if (this.checked === false)
			{
				return;
			}

			// start the colors at a random interval
			var i = Math.floor(Math.random() * 256),
				increase = true,
				interval = 10,
				calls = 0;

			function run()
			{
				// disable chill mode
				if (self.checked === false)
				{
					return;
				}

				// only change the color every 10th repaint.
				if (calls === interval)
				{
					calls = 0;
				}
				else
				{
					calls++;
					return requestAnimFrame(run);
				}

				if (i === 255)
				{
					increase = false;
				}
				else if (i === 0)
				{
					increase = true;
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

				i = i + (increase ? 1 : -1);

				return requestAnimFrame(run);
			}

			run();
		});
		/* #endregion */

		/* #region inverse checkbox and color inputs */
		toggles.inverse.addEventListener('change', function (e)
		{
			var temp = diskStyles.backgroundColor;
			diskStyles.backgroundColor = diskStyles.borderColor;
			diskStyles.borderColor = temp;

			toggles.colorbg.jscolor.fromString(diskStyles.backgroundColor);
			toggles.colorborder.jscolor.fromString(diskStyles.borderColor);
			updateStylesheet();
		});

		jscolor.init();
		toggles.colorbg.jscolor = new jscolor.color(toggles.colorbg,
			{
				hash              : true,
				onImmediateChange : function ()
				{
					diskStyles.backgroundColor = this.valueElement.value;
					updateStylesheet();
				}
			});

		toggles.colorborder.jscolor = new jscolor.color(toggles.colorborder,
			{
				hash              : true,
				onImmediateChange : function ()
				{
					diskStyles.borderColor = this.valueElement.value;
					updateStylesheet();
				}
			});
		/* #endregion */

		/* #region sliders */
		toggles.width.addEventListener('input', function ()
		{
			diskOptions.width = this.value;
		});
		/* #endregion */

		/* #region FPS slider and reverse toggle */
		toggles.fps.addEventListener('input', function ()
		{
			toggles.reverse.checked = this.value < 0;

			runOptions.fps = this.value;
		});

		toggles.reverse.addEventListener('change', function ()
		{
			if (this.checked && runOptions.fps < 0)
			{
				return;
			}

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
		Array.prototype.forEach.call(toggles, function (e)
		{
			defaults.formOptions[e.name] = e.type === 'checkbox' ? e.checked : e.value;
		});

		buttons.reset.addEventListener('click', function ()
		{
			copyObj(diskStyles, defaults.diskStyles);
			copyObj(diskOptions, defaults.diskOptions);
			copyObj(runOptions, defaults.runOptions);

			Array.prototype.forEach.call(toggles, function (e)
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

		buttons.fullscreen.addEventListener('click', function ()
		{
			var elem = document.getElementById('container').childNodes[0];
			if (elem.requestFullscreen)
			{
				elem.requestFullscreen();
			}
			else if (elem.msRequestFullscreen)
			{
				elem.msRequestFullscreen();
			}
			else if (elem.mozRequestFullScreen)
			{
				elem.mozRequestFullScreen();
			}
			else if (elem.webkitRequestFullscreen)
			{
				elem.webkitRequestFullscreen();
			}
		});
		/* #endregion */
	})();

	run();
};

document.addEventListener('DOMContentLoaded', domContentLoaded, false);
document.attachEvent ? document.attachEvent('onreadystatechange', domContentLoaded) : null;