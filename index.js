const scrape = require('website-scraper');

let options = {
    urls: ['https://sananton.msm.io/'],
    directory: 'source',
};

scrape(options).then((result) => {
    console.log('Website Succesfully Downloaded!');
})

.catch((err) => {
    console.log('Opps, Looks Like An Error Ocurred!', err);
});