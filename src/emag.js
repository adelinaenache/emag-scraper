
const puppeteer = require('puppeteer');
const _ = require('lodash');

class Emag {
	constructor(props) {
		this.departaments = [];
		this.saveToDb = props.saveToDb;
		this.queue = [];
	}

	async nextPage() {
		try {
			await this.page.evaluate(() => {
				let next = document.querySelector('#listing-paginator > li:nth-child(4) > a');

				if (next.getAttribute('href').indexOf('supermarket') !== -1) {
					next.click();

					return true;
				}

				return false;
			});
		} catch (err) {
			return false;
		}
	}

	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async init(link) {
		const browser = await puppeteer.launch({
			headless: false,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});

		this.page = await browser.newPage();

		await this.page.setViewport({
			width: 800,
			height: 1200
		});

		await this.page.goto(link);

		let categories = await this.page.evaluate(() => {
			let blockers = document.querySelectorAll('.blockUI');
			let widgets = document.querySelector('.widgets');
			let urlDivs = widgets.querySelectorAll('a');
			let url = [];

			if (blockers) {
				blockers.forEach(blocker => {
					blocker.remove();
				});
			}

			urlDivs.forEach(urlDiv => {
				url.push(urlDiv.getAttribute('href'));
			});

			return url;
		});

		categories.forEach(category => {
			this.departaments.push(`https://www.emag.ro${category}`);
		});

		console.log('Done initializing.');
	}

	async getLinksForDepartament(link) {
		await this.page.goto(link);

		let hrefs = await this.page.evaluate(() => {
			let blockers = document.querySelectorAll('.blockUI');
			let box = document.querySelector('.emg-aside-links');
			let hrefs = box.querySelectorAll('a');
			let links = [];

			if (blockers) {
				blockers.forEach(blocker => {
					blocker.remove();
				});
			}

			hrefs.forEach(href => {
				links.push(href.getAttribute('href'));
			});

			return links;
		});

		return hrefs;
	}

	async getProducts(link) {
		let products = await this.page.evaluate(() => {
			let cards = document.querySelectorAll('.card-supermarket');
			let products = [];

			cards.forEach(card => {
				let product = {};

				product.imageLink = card.querySelector('.js-product-url').getAttribute('href');
				product.title = card.querySelector('.product-title').textContent;
				product.link = card.querySelector('.product-title').getAttribute('href');
				product.rawPrice = card.querySelector('.product-new-price').innerText;
				product.price = parseInt(product.rawPrice.split(' ')[0], 10) * 0.01;

				products.push(product);
			});


			return products;
		});

		return products;
	}

	async addLinks() {
		let links = await this.page.evaluate(() => {
			let links = [];
			let linksTab = document.querySelectorAll('.sidebar-tree-body');

			linksTab.forEach(link => {
				links.push(link.getAttribute('href'));
			});

			return links;
		});

		links.forEach(link => {
			if (this.queue.indexOf(link) === -1) {
				this.queue.push(link);
			}
		});
	}

	async run() {
		await this.init('https://www.emag.ro/supermarket?ref=hdr_supermarket_categorii-supermarket');

		await _.reduce(this.departaments, async (promise, link) => {
			await promise;

			let links = await this.getLinksForDepartament(link);

			this.queue = this.queue.concat(links);

			return Promise.resolve();
		}, Promise.resolve());

		await _.reduce(this.queue, async (promise, link) => {
			await promise;
			await this.page.goto(`https://www.emag.ro${link}`);

			let isNext = true;

			console.log(`Get products for ${link} `);

			while (isNext) {
				try {
					let products = await this.getProducts();
					console.log(`Got ${products.length} products`);
					products.forEach(product => {
						this.saveToDb(product);
					});

					isNext = await this.nextPage();
					await this.sleep(15000);
				} catch (err) {
					console.log(err);
					isNext = false;
				}
			}

			return Promise.resolve();
		}, Promise.resolve());
	}
}



module.exports = Emag;