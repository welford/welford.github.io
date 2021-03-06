function GLT_GetListOfGLFunctionsNames(input)
{
	//super dumb, not robust, just needs to do one thing
	var lines = input.split("\n");
	var lstFunctionNames = [];
	for(i in lines)
	{
		if(lines[i].includes("GLAPI")){
			if(!lines[i].includes("#"))
			{
				var lstComponents = lines[i].replace("*","").split(/\s+/);
				var idx = lstComponents.indexOf("APIENTRY");
				lstFunctionNames.push(lstComponents[idx+1]);
				//console.log(lstComponents[idx+1]);
			}
		}
	}
	return lstFunctionNames;
}

function GLT_GetListOfWGLFunctionsNames(input)
{
	//super dumb, not robust, just needs to do one thing
	var lines = input.split("\n");
	var lstFunctionNames = [];
	for(i in lines)
	{
		if(lines[i].includes("WINAPI wgl")){
			if(!lines[i].includes("#"))
			{
				var lstComponents = lines[i].replace("*","").split(/\s+/);
				var idx = lstComponents.indexOf("WINAPI");
				lstFunctionNames.push(lstComponents[idx+1]);
			}
		}
	}
	return lstFunctionNames;
}

var __headerTemplate = [`#ifndef __LOCAL_GL_H__
#define __LOCAL_GL_H__

//generated by glue, see www.github.com/welford/glue

#ifdef __cplusplus
extern "C" {
#endif

#include "./glcorearb.h"

// Helper macros to save some boostrap
#define GEN_DefineVar(DEF,VAR)		extern DEF VAR;
#define GEN_DeclareVar(DEF,VAR)		DEF VAR = 0;

#define GEN_DefineGLVar(DEF,VAR)	extern PFN##DEF##PROC VAR;
#define GEN_DeclareGLVar(DEF,VAR)	PFN##DEF##PROC  VAR = 0;


// could also do it this way...hmmm
//		#define GEN_DefineOGLVar(DEF,VAR)		extern PFN##DEF##PROC VAR;
//		#define GEN_DeclareOGLVar(DEF,VAR)		PFN##DEF##PROC  VAR = 0;
//		#define GEN_QueryVar(DEF,VAR)			VAR = (PFN##DEF##PROC)((wglGetProcAddress(#VAR) != 0) ? wglGetProcAddress(#VAR) : GetProcAddress(MOD, #VAR));
//		#define FOREACH_OGL(GEN)\\
//			GEN(GLCULLFACE, glCullFace)
//			GEN(GLGETSTRING, glGetString)
// which makes creating the for each array a bit easier.


// Declare all the functions we will use in the format below.
//		#define FOREACH_WGL(GEN)\\
//			GEN(WGLCHOOSEPIXELFORMATARB,		wglChoosePixelFormatARB)		\\
//			GEN(WGLCREATECONTEXTATTRIBSARB,		wglCreateContextAttribsARB)		\\
//			...
// then using 
//		FOREACH_WGL(GEN_DefineVar);
// That will generate 
//		extern PFNWGLCHOOSEPIXELFORMATARBPROC wglChoosePixelFormatARB = NULL;
//		extern PFNWGLCREATECONTEXTATTRIBSARBPROC wglCreateContextAttribsARB = NULL;
//		....
// for all values in FOREACH_WGL, i will do the same below for all vanilla opengl functions
// we can then use the macro to help up loop over the initialisation in the cpp file
// save writing a bunch of bootstrap code

void InitialiseOpenGLFunctionPointers(void);

#define FOREACH_OGL(GEN) \\
`,
//	GEN(GLCULLFACE,						glCullFace)						\
//	GEN(GLGETSTRING,					glGetString)					\
//	etc...
`
FOREACH_OGL(GEN_DefineGLVar);

// Platform specific
#if		_WIN32
#include "./wglext.h"

// To use this one define 
//		HMODULE MOD = LoadLibraryA("opengl32.dll");
// before your FOREACH_ loop

#define GEN_QueryVar(DEF,VAR)		VAR = (DEF)((wglGetProcAddress(#VAR) != 0) ? wglGetProcAddress(#VAR) : GetProcAddress(MOD, #VAR));
#define GEN_QueryGLVar(DEF,VAR)		VAR = (PFN##DEF##PROC)((wglGetProcAddress(#VAR) != 0) ? wglGetProcAddress(#VAR) : GetProcAddress(MOD, #VAR));

#define FOREACH_WGL(GEN) \\
`,
//	GEN(WGLCHOOSEPIXELFORMATARB,		wglChoosePixelFormatARB)		\
//	GEN(WGLCREATECONTEXTATTRIBSARB,		wglCreateContextAttribsARB)
//  etc...
`
FOREACH_WGL(GEN_DefineGLVar);

void InitialiseWGLFunctionPointers(void);
#endif //_WIN32

#ifdef __cplusplus
}
#endif

#endif //__LOCAL_GL_H__
`
];

function GLT_GenerateGLHeader(lstGLFunctions, lstWGLFunctions)
{
	var strOutput = __headerTemplate[0];
	var maxStrLen = 0;
	for(i in lstGLFunctions)
	{
		if(maxStrLen < lstGLFunctions[i].length)	
		{
			maxStrLen = lstGLFunctions[i].length;
		}
	}
	for(i in lstWGLFunctions)
	{
		if(maxStrLen < lstWGLFunctions[i].length)	
		{
			maxStrLen = lstWGLFunctions[i].length;
		}
	}
	maxStrLen = maxStrLen + 2;//+2 because the array.join is one off
	 
	for(i in lstGLFunctions)
	{
		var spaces = Array(maxStrLen - lstGLFunctions[i].length).join(" ");
		var end = i == lstGLFunctions.length - 1 ? "\n": spaces + "\\\n";
		strOutput += "	GEN(" + lstGLFunctions[i].toUpperCase() + "," + spaces + lstGLFunctions[i] + ")" + end;
	}
	strOutput += __headerTemplate[1];
	for(i in lstWGLFunctions)
	{
		var spaces = Array(maxStrLen - lstWGLFunctions[i].length).join(" ");
		var end = i == lstWGLFunctions.length - 1 ? "\n": spaces + "\\\n";
		strOutput += "	GEN(" + lstWGLFunctions[i].toUpperCase() + "," + spaces + lstWGLFunctions[i] + ")" + end;
	}
	strOutput += __headerTemplate[2];
	return strOutput;
}

function GLT_GenerateGLCFile()
{
	return `#include "./gl.h"

//TODO: add a way for local projects to override these initialisation steps

FOREACH_OGL(GEN_DeclareGLVar);

void InitialiseOpenGLFunctionPointers(void)
{
	HMODULE MOD = LoadLibraryA("opengl32.dll");
	FOREACH_OGL(GEN_QueryGLVar);
}

#if _WIN32

FOREACH_WGL(GEN_DeclareGLVar);

void InitialiseWGLFunctionPointers(void)
{
	HMODULE MOD = LoadLibraryA("opengl32.dll");
	FOREACH_WGL(GEN_QueryGLVar);
}	
#endif //_WIN32
`
}

var lstGL = [];
var lstWGL 	=  [];

function GLT_Download(filename, text){
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

function GLT_HandleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}


function GLT_HandleDraggedAndDroppedData(e)
{
	e.stopPropagation();
	e.preventDefault();
	var items = e.dataTransfer.items; // Array of all files
	
	for (var i=0, item; item=items[i]; i++) {
		if (item.type.match(/text\/plain.*/)) {
			var reader = new FileReader();
			reader.onload = function(e2) {
				if(e2.target.result.includes("__glcorearb_h_")){
					lstGL = GLT_GetListOfGLFunctionsNames(e2.target.result);
				}else if(e2.target.result.includes("__wglext_h_")){
					lstWGL = GLT_GetListOfWGLFunctionsNames(e2.target.result);
				}
				else if(e2.target.result.includes("__glext_h_")){
					lstGL = GLT_GetListOfGLFunctionsNames(e2.target.result);
				}else{
					console.log("unknown text file")
				}
				if(lstGL.length > 0 && lstWGL.length > 0)
				{
					var header = document.getElementById("download_button_h");
					header.onclick = function() {GLT_Download('gl.h',GLT_GenerateGLHeader(lstGL, lstWGL));}
					header.style.display = "block";

					var c = document.getElementById("download_button_c");
					c.onclick = function() {GLT_Download('gl.c',GLT_GenerateGLCFile());}
					c.style.display = "block";

					document.getElementById("dropbox").style.display = "None";
					document.getElementById("explanation").style.display = "None";
				}
				//img.src= e2.target.result;
			}
			var textData = event.dataTransfer.getData ("text");
			if (!textData) {
				reader.readAsText(e.dataTransfer.files[i]); // start reading the file data.
			}else{
				var myBlob = new Blob([textData], {type : "text/plain"});
				reader.readAsText(myBlob); // start reading the file data.
			}
		}
	}
}