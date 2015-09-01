#!/usr/bin/env node

var async = require('async');
var fs = require('fs');
var path = require('path');
var request = require('request');
var argv = require('yargs').default('begin', 'false').default('end', 'false').argv;
var url = 'https://foia.state.gov/searchapp/Search/SubmitSimpleQuery?_dc=1435715745543&searchText=*&beginDate=false&endDate=false&collectionMatch=Clinton_Email&postedBeginDate='+argv.begin+'&postedEndDate='+argv.end+'&caseNumber=false&page=4&start=0&limit=50000#';
var docUrlPrefix = 'http://foia.state.gov/searchapp/';

request.get({url: url, strictSSL: false})
	.on('error', handleError)
	.on('response', handleResponse);

var q = async.queue(function (doc, callback) {
	request.get({url: docUrlPrefix + doc.pdfLink, strictSSL: false})
		.on('error', handleError)
		.on('response', function(res) {
			res.pipe(fs.createWriteStream('documents/'+path.basename(doc.pdfLink)));
			callback(null, doc);
		});
}, 5);

// assign a callback
q.drain = function() {
	console.log('All docs downloaded');
};

function handleError(err) {
	console.log("Got error: " + err.message);
}

function handleResponse(res) {
	var data = '';
	res.on('data', function(chunk){
		data += chunk;
	}).on('end', function(){
		handleData(data);
	});
}

function handleData(data) {
	data = JSON.parse(data.replace(/\"(docDate|postedDate)\"\:new Date\(([^\)]*)\)/g, '"$1":"$2"'));
	data.Results.forEach(function(result){
		q.push(result, function (err, doc) {
			console.log('Downloaded ' + doc.pdfLink);
		});
	});
}
