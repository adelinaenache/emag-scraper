// const Emag = require('./src/emag');
const config = require('./config');
const productSchema = require('./src/models/product');
const mongoose = require('mongoose');
const Worker = require('./src/emag');
const Product = mongoose.model('Product', productSchema);

function saveToDb(product) {
	let pr = new Product(product);

	pr.save().catch(err => {
		console.log(err);
	});
}

mongoose.Promise = global.Promise;

mongoose.connect(config.mongo.url, err => {
	if (err) {
		throw err;
	}
	let emag = new Worker({ saveToDb: saveToDb });

	emag.run();
});

process.once('uncaughtException', err => {
	console.log(err);
});
