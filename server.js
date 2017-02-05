var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var url = require('url');
var async = require('async'); // https://www.npmjs.com/package/async
var path = require('path');

const siteurl = 'https://ametist-store.ru/catalog/materialy-dlya-mebeli/mebelnye-tkani'

const target = `${siteurl}/?TEMPLATE=block&set_filter=y&arrFilter_81_498629140=Y&arrFilter_81_1790921346=Y&arrFilter_P2_MAX=24219&arrFilter_P2_MIN=115`;

const imagesDir = path.resolve(__dirname, './images');

function download(uri, filename, callback){
  request.head(uri, function(err, res, body){
	  if(!err){
		  request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	  }
	  else { console.error(`donwload ${uri} fails: ${err}`); }
  });
}

request(target, function (error, response, html) {
    if (!error) {
        var $ = cheerio.load(html);
        var items = $('.item>.img>a');
        //var new_items = items.filter(function () {
        //    var data = $(this);
        //    var founded = data.children().find('span');
        //    return founded !== undefined && founded.hasClass('new');
        //});

        var items_pages = items.map(function (i, e) {
            return $(e).attr('href');
        });

        const links = [];
		items_pages.map(function (i, e) {
            links.push(url.resolve(siteurl, e));
        });

		 async.map(links, function(u, callback) {
			console.log(`request image page ${u}`);
		 	request(u, function(error, response, html) {
                if(!error){
					console.log("asking for images...");
                    const thumbs = $(".gallery-thumbs")
                    const images_links = thumbs.map( (i, e) => {
                        return $(e).attr('data-src');
                    });

					const imageType = path.basename(u);
					const dest = path.resolve(imagesDir, imageType);
					fs.mkdir(dest);

                    async.map(images_links, (il, callback) => {
						const filename = `${dest}/${path.basename(il)}`;
						download(url.resolve(siteurl, il), filename);
					});
                }
                else{ console.log(`error when processing ${url}`); }
		 	});
		 }, function(err, results) {
		 	console.log("error occur:", err, results);
		});
    }
});
