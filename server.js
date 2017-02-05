var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var url = require('url');
var async = require('async'); // https://www.npmjs.com/package/async
var path = require('path');

var mkdirSync = function (path) {
  try {
    fs.mkdirSync(path);
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}

const siteurl = 'https://ametist-store.ru/catalog/materialy-dlya-mebeli/mebelnye-tkani'

const target = `${siteurl}/?TEMPLATE=block&set_filter=y&arrFilter_81_498629140=Y&arrFilter_81_1790921346=Y&arrFilter_P2_MAX=24219&arrFilter_P2_MIN=115`;

const imagesDir = path.resolve(__dirname, './images');

mkdirSync(imagesDir);

function getDescription($) {
    const rows = $('.good-main-descr table tr')
    let result = {}
    rows.map(function(i, tr) {
        const tds = $(tr).children()
        const title = $(tds[0]).text()
        const value = $(tds[1]).text()
        result[title] = value
    });
    return result
}

function download(uri, filename, callback){
    console.log(`download image ${uri} to ${filename}`);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', () => console.log(`finished download ${uri}`));
}

function loadImages($, destFolder) {
    // get images links
    const imgs = $(".gallery-thumbs > a");
    const images_links = imgs.map( (i, e) => {
        return $(e).data('src');
    });
    console.log(`downloading images:|${images_links}|`);
    async.map(images_links, (il, callback) => {
        const fileurl = url.resolve(siteurl, il);
        const filename = `${destFolder}/${path.basename(il)}`;
        download(fileurl, filename);
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
					$ = cheerio.load(html);
                    const ragModel = path.basename(u);
                    const destFolder = path.resolve(imagesDir, ragModel);
                    mkdirSync(destFolder);

                    loadImages($, destFolder);

                    const desrFile = fs.createWriteStream(`${destFolder}/notes.txt`);
                    console.log(`getting description for ${desrFile}`)
                    const description = getDescription($);
                    // write notes
                    desrFile.write(JSON.stringify(description, "", 2));
                    desrFile.end();

                }
                else{ console.log(`error when processing ${url}`); }
            });
        }, function(err, results) {
            console.log("error occur:", err, results);
        });
    }
});
