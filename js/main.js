(function()
{
	'use strict';

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

	function Disk(radius, xy)
	{
		this.disk = document.createElement('div');
		this.disk.className = 'disk';

		this.setParams(radius, xy);
	}

	Disk.prototype.setParams = function(radius, xy)
	{
		this.disk.style.width = (radius * 2) + 'px';
		this.disk.style.height = (radius * 2) + 'px';
		this.disk.style.left = (xy[0] === radius ? 0 : (xy[0] - radius)) + 'px';
		this.disk.style.top = (xy[1] === radius ? 0 : (xy[1] - radius)) + 'px';

		return this;
	};

	function polar2cart(radius, angle)
	{
		return [
			radius * Math.cos(angle),
			radius * Math.sin(angle)
		];
	}

	var diskStyles =
	{
		backgroundColor : '#FFFFFF',
		borderColor     : '#000000'
	};

	var diskOptions =
	{
		opacity : false,
		running : true,
		width   : 400
	};

	var runOptions =
	{
		duration         : 2.0,
		fps              : 20,
		ndisks_per_cycle : 8,
		speed            : 0.05,
		frameRate        : 40.0 // duration * fps
	};

	function bootstrap()
	{
		var edgeContainer = document.getElementById('container'),
			centeringElem = document.createElement('div');

		centeringElem.className = 'center';

		var circle1 = new Disk(0.65 * diskOptions.width, [0.65 * diskOptions.width, 0.65 * diskOptions.width]),
			circle2 = new Disk(0.42 * diskOptions.width, [0.42 * diskOptions.width, 0.42 * diskOptions.width]);

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

				color = ((1.0 * i / runOptions.ndisks_per_cycle) % 1.0);

				circle = disks[i].setParams(0.3 * diskOptions.width, cartCoords).disk;

				circle.style.borderColor = diskStyles.borderColor;
				circle.style.backgroundColor = diskStyles.backgroundColor;
				circle.style.opacity = diskOptions.opacity ? color : 1;
			}
		}

		return make_frame;
	}

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

	var makeFrameMethod = bootstrap();
	(function configureToggles()
	{
		var toggles = document.getElementsByTagName('input');

		/* #region checkboxes */
		toggles.opacity.addEventListener('change', function()
		{
			diskOptions.opacity = this.checked;
		});

		toggles.running.addEventListener('change', function()
		{
			diskOptions.running = this.checked;
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
				}
			});

		toggles.colorborder.jscolor = new jscolor.color(toggles.colorborder,
			{
				hash              : true,
				onImmediateChange : function()
				{
					diskStyles.borderColor = this.valueElement.value;
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
	})();

	run(makeFrameMethod);
})();