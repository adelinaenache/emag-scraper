const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
require('mongoose-double')(mongoose);

const SchemaTypes = mongoose.Schema.Types;

let ProductSchema = new Schema({
	price: SchemaTypes.Double,
	imageLink: String,
	rawPrice: String,
	title: String,
	link: String
});


module.exports = ProductSchema;