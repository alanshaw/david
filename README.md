<img src="https://raw.github.com/alanshaw/david/master/david.png"/>

David
=====

Nodejs based web service that tells you when your project npm dependencies are out of date.

Getting Started
---------------

Install [Node.js](http://nodejs.org/)

Install grunt:

	npm install -g grunt

Install dependencies:

	npm install request
	npm install npm
	npm install express
	npm install moment
	npm install semver

Run david:

	node david 8080


Example usage
-------------

Get all dependencies (and their versions) for _public_ GitHub repository "grunt-jsio" owned by "alanshaw":

	curl http://localhost:8080/alanshaw/grunt-jsio/deps

Get updated dependencies (and their current version numbers):

	curl http://localhost:8080/alanshaw/grunt-jsio/deps/updated

