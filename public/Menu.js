Vue.component('MyMenu', {
	data() {
		return {
			items: [
				{
					url: './index.html',
					title: 'List 10 files'
				},
				{
					url: './upload.html',
					title: 'Upload file'
				}
			]
		}
	},
	template: `<nav class="navbar is-dark" role="navigation" aria-label="main navigation">

					<div class="navbar-brand">

						<a class="navbar-item">
							<img src="./images/logo.png">
						</a>
					
						<a role="button" class="navbar-burger burger" aria-label="menu" aria-expanded="false" data-target="navbarBasicExample">
							<span aria-hidden="true"></span>
							<span aria-hidden="true"></span>
							<span aria-hidden="true"></span>
						</a>

					</div>
				
					<div id="navbarBasicExample" class="navbar-menu">

						<div class="navbar-start">

							<a v-for="item of items" class="navbar-item" :href="item.url">
								{{item.title}}
							</a>

						</div>

					</div>

				</nav>`
});