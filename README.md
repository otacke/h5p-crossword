# H5P Crossword
Crossword puzzle for H5P.

PLEASE NOTE: THIS CONTENT TYPE IS THE RESULT OF CONTRACT WORK WITH SPECIFIC
REQUIREMENTS THAT MAY NOT MATCH YOUR OWN EXPECTATIONS. WHILE OLIVER IS THE
DEVELOPER, HE'S MERELY THE CONTRACTOR WHO ALSO HAPPENED TO PLEAD FOR MAKING 
THIS CONTENT TYPE OPENLY AVAILABLE - SO YOU CAN USE IT FOR FREE. HOWEVER, HE
IS NOT SUPPOSED TO PROVIDE FREE SUPPORT, ACCEPT FEATURE REQUESTS OR PULL 
REQUESTS. HE MAY DO SO, AND HE WILL PROBABLY ALSO CONTINUE WORKING ON THE 
CONTENT TYPE, BUT AT HIS OWN PACE.

## Getting started
Clone this repository with git and check out the branch that you are interested
in (or choose the branch first and then download the archive, but learning
how to use git really makes sense).

Change to the repository directory and run
```bash
npm install
```

to install required modules. Afterwards, you can build the project using
```bash
npm run build
```

or, if you want to let everything be built continuously while you are making
changes to the code, run
```bash
npm run watch
```
Before putting the code in production, you should always run `npm run build`.

The build process will transpile ES6 to earlier versions in order to improve
compatibility to older browsers. If you want to use particular functions that
some browsers don't support, you'll have to add a polyfill.

The build process will also move the source files into one distribution file and
minify the code.

For more information on how to use those distribution files in H5P, please have a look at https://youtu.be/xEgBJaRUBGg and the H5P developer guide at https://h5p.org/library-development.
