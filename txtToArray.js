const fs = require('fs');

// Path to the text file
const txtFilePath = 'wh.txt';
// Path where you want to save the JSON file
const jsonFilePath = 'wh.json';

// Read the text file
fs.readFile(txtFilePath, 'utf8', (err, data) => {
	if (err) {
		console.error('Error reading the file:', err);
		return;
	}

	// Split the data into an array of phrases (one per line)
	const phrases = data.split('\n').map(phrase => phrase.trim()).filter(phrase => phrase !== '');

	// Create a JSON object
	const jsonObject = { phrases: phrases };

	// Write the JSON object to a file
	fs.writeFile(jsonFilePath, JSON.stringify(jsonObject, null, 2), (err) => {
		if (err) {
			console.error('Error writing the JSON file:', err);
			return;
		}
		console.log('JSON file has been saved!');
	});
});
