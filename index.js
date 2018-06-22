var express = require('express')
var app = express()
var fs = require('fs');
var random = require('hat')
var mammoth = require("mammoth");

app.set('port', (process.env.PORT || 7190))
app.use(express.static(__dirname + '/public'))

app.get('/', function(request, response) {
    response.send('Hello World!')
})

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'))
})

var paper_id = random()
var image_count = 0
var paper_images = []
var options = {
    convertImage: mammoth.images.imgElement(function(image) {
        image.read("base64").then(function(imageBuffer) {
            var filename = paper_id + "-" + image_count + "." + image.contentType.replace('image/', '');
            paper_images.push(filename)
            image_count++;
            var buf = Buffer.from(imageBuffer, 'base64')
            fs.writeFile(filename, buf, function(err) {});
        });
    })
};

// you can pick file from buffer to using buffer : buffer instead of path
//save images in order of their occurance
mammoth.convertToHtml({
    path: "sample_paper.docx"
}, options).done();

// draw text from the file and parse it
mammoth.extractRawText({
        path: "sample_paper.docx"
    }, options)
    .then(function(result) {
        var text = result.value;
        var messages = result.messages;
        parseText(text, paper_images, function(result) {

        });
    })
    .done();

var paper = []

function parseText(text, paper_images, callback) {
    var name_blob_start = text.indexOf("||")
    var name_blob_end = text.indexOf("||", name_blob_start + 1);
    var name = text.substring(name_blob_start + 2, name_blob_end).trim()
    var instructions_start = text.indexOf("/*")
    var instructions_end = text.indexOf("*/")
    var instructions = text.substring(instructions_start + 2, instructions_end).trim()
    var section_blob = text.split('@')
    paper.push({
    	'name' : name,
    	'instructions' : instructions
    })
    for (var i = 1; i < section_blob.length; i++) {
        paper.push(handleSections(section_blob[i].trim(), paper_images));
    }
    console.log(JSON.stringify(paper));
}

function handleSections(section, paper_images) {
    var res = []
    question_blob = section.split('#')
    for (var i = 1; i < question_blob.length; i++) {
        res.push(handleQuestions(question_blob[i].trim(), paper_images))
    }
    //console.log('Section Res:' + JSON.stringify(res))
    return res;
}

var paper_image_counter = 0

function handleQuestions(question, paper_images) {
    var res = {}
    var type_blob_start = question.indexOf("(")
    var type_blob_end = question.indexOf(")")
    var type = question.substring(type_blob_start + 1, type_blob_end).toLowerCase()
    var log = ""
    if (type.indexOf("multi") >= 0) {
        res['multi'] = true
    } else {
        res['multi'] = false
    }

    if (type.indexOf("image") >= 0) {
        res['image'] = true
        res['image_loc'] = paper_images[paper_image_counter]
        paper_image_counter++;
    } else {
        res['image'] = false
    }

    var options_blob = question.substring(type_blob_end + 1).split("$")
    res['question'] = options_blob[0].split("=")[0].trim()
    for (var i = 1; i < options_blob.length; i++) {
        res['option' + i] = handleOptions(options_blob[i].trim())
    }
    var answer_blob = question.split("=")[1].trim()
    var explaination_start = answer_blob.indexOf("(")
    if( explaination_start >=0){
    	var explaination_end = answer_blob.indexOf(")")
    	res['explianation'] = answer_blob.substring(explaination_start+1, explaination_end).trim()
    	res['answer'] = answer_blob.substring(0, explaination_start).trim()
    } else {
    	res['explianation'] = ""
		res['answer'] = answer_blob.trim()
    }
    //console.log('Question Res:' + JSON.stringify(res))
    return res;
}

function handleOptions(option) {
    var p = option.indexOf("=")
    var ans = ""
    if (p >= 0) {
        ans = option.substring(0, p).trim()
    } else {
        ans = option
    }
    return ans
}