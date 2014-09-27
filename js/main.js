(function ()
{
	'use strict';

	var diskStyles =
	{
		backgroundColor : 'white',
		borderColor     : 'black'
	};

	var diskOptions =
	{
		opacity : false,
		running : true,
		width : 400
	};

	function Disk(radius, xy)
	{
		var disk = document.createElement('div');
		disk.className = 'disk';

		disk.style.width = (radius * 2) + 'px';
		disk.style.height = (radius * 2) + 'px';
		disk.style.left = (xy[0] === radius ? 0 : (xy[0] - radius)) + 'px';
		disk.style.top = (xy[1] === radius ? 0 : (xy[1] - radius)) + 'px';

		return disk;
	}

	function polar2cart(radius, angle)
	{
		return [
			radius * Math.cos(angle),
			radius * Math.sin(angle)
		];
	}

	function run()
	{
		var edgeContainer = document.getElementById('container'),
			centeringElem = document.createElement('div');

		centeringElem.className = 'center';

		var duration = 2.0,
			fps = 20,
			ndisks_per_cycle = 8,
			speed = 0.05;

		var circle1 = Disk(0.65 * diskOptions.width, [0.65 * diskOptions.width, 0.65 * diskOptions.width]),
			circle2 = Disk(0.42 * diskOptions.width, [0.42 * diskOptions.width, 0.42 * diskOptions.width]);

		circle2.appendChild(centeringElem);
		circle1.appendChild(circle2);
		edgeContainer.appendChild(circle1);

		function make_frame(t)
		{
			var delay_between_disks = 1.0 * duration / 2 / ndisks_per_cycle,
				total_number_of_disks = parseInt(ndisks_per_cycle / speed, 10),
				start = 1.0 / speed;

			centeringElem.innerHTML = '';
			for (var i = 0; i < total_number_of_disks; i++)
			{
				var angle = (Math.PI / ndisks_per_cycle) * (total_number_of_disks - i - 1),
					radius = Math.max(0, 0.05 * (t + start - delay_between_disks * (total_number_of_disks - i - 1)));

				var cartCoords = polar2cart(radius, angle);
				cartCoords[0] = (cartCoords[0] + 0.5) * diskOptions.width;
				cartCoords[1] = (cartCoords[1] + 0.5) * diskOptions.width;

				var color = ((1.0 * i / ndisks_per_cycle) % 1.0),
					circle = Disk(0.3 * diskOptions.width, cartCoords);

				circle.style.borderColor = diskStyles.borderColor;
				circle.style.backgroundColor = diskStyles.backgroundColor;
				circle.style.opacity = diskOptions.opacity ? color : 1;

				centeringElem.appendChild(circle);
			}
		}

		var t = 0,
			frameRate = duration * fps;

		window.setInterval(function ()
		{
			if (!diskOptions.running) return;

			var frame = t / fps;
			if (t === frameRate)
			{
				t = 0;
			}

			make_frame(frame);

			t++;
		}, frameRate);
	}

	function configureToggles()
	{
		var toggles = document.getElementsByTagName('input');

		toggles.opacity.addEventListener('change', function()
		{
			diskOptions.opacity = this.checked;
		});

		toggles.inverse.addEventListener('change', function()
		{
			var temp = diskStyles.backgroundColor;
			diskStyles.backgroundColor = diskStyles.borderColor;
			diskStyles.borderColor = temp;
		});

		toggles.running.addEventListener('change', function()
		{
			diskOptions.running = this.checked;
		});

		toggles.width.addEventListener('change', function()
		{
			diskOptions.width = this.value;
		});

		toggles.colorbg.addEventListener('change', function()
		{
			diskStyles.backgroundColor = this.value;
		});

		toggles.colorborder.addEventListener('change', function()
		{
			diskStyles.borderColor = this.value;
		});
	}

	configureToggles();

	run();
})();