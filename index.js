var async = require('async');
var fs = require('fs');
var path = require('path');
var http = require('http');
var url = 'http://foia.state.gov/searchapp/Search/SubmitSimpleQuery?_dc=1435715745543&searchText=*&beginDate=false&endDate=false&collectionMatch=Clinton_Email&postedBeginDate=false&postedEndDate=false&caseNumber=false&page=4&start=0&limit=50000#';
var docUrlPrefix = 'http://foia.state.gov/searchapp/';

http.get(url, handleResponse).on('error', function(e) {
  console.log("Got error: " + e.message);
});

var q = async.queue(function (document, callback) {
	var file = fs.createWriteStream('documents/'+path.basename(document.pdfLink));
	var request = http.get(docUrlPrefix + document.pdfLink, function(res) {
  		res.pipe(file);
		callback(null, document);
	});
}, 5);

// assign a callback
q.drain = function() {
	console.log('All docs downloaded');
};


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
