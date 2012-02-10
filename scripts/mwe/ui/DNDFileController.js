/**
 
 Copyright 2011 Luis Montes

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

**/

dojo.provide("mwe.ui.DNDFileController");

dojo.declare("mwe.ui.DNDFileController", null, {
        node: null, //the DOM element
        borderStyle: null,
        borderDropStyle : '3px dashed red',
		
        constructor: function(/* Object */args){
            dojo.safeMixin(this, args);
            if(this.node == null){
            	this.node = dojo.byId(this.id);
            }
            dojo.connect(this.node,'dragenter',this,this.dragenter);
            dojo.connect(this.node,'dragover',this,this.dragover);
            dojo.connect(this.node,'dragleave',this,this.dragleave);
            dojo.connect(this.node,'drop',this,this.preDrop);
            this.borderStyle = dojo.style(this.node,'border');
        },
        dragenter : function(e) {
    	    e.stopPropagation();
    	    e.preventDefault();
    	    dojo.style(this.node,'border', this.borderDropStyle);
    	    
    	  },

    	  dragover : function(e) {
    	    e.stopPropagation();
    	    e.preventDefault();
    	  },

    	  dragleave : function(e) {
    	    e.stopPropagation();
    	    e.preventDefault();
    	   // this.node.classList.remove('rounded');
    	    dojo.style(this.node,'border',this.borderStyle);
    	  },
    	  
    	  preDrop: function(e){
    		  dojo.style(this.node,'border',this.borderStyle);
    		  e.stopPropagation();
			  e.preventDefault();
			  
    		  this.drop(e);
    	  },
    	  
    	  drop: function (e){
    		  
    		  
    		  try{
    			  
    		
    			    var files = e.dataTransfer.files;
    		
    			    for (var i = 0, file; file = files[i]; i++) {
    			      // FileReader
    			      var reader = new FileReader();
    			      console.log('file',file);
    			      
    			      reader.onerror = function(evt) {
    			         console.log('Error code: ' + evt.target.error.code);
    			      };
    			      reader.onload = (function(aFile) {
    			        return function(evt) {
    			          if (evt.target.readyState == FileReader.DONE) {
    			         	  
    			        	  //console.log('evt',evt);
    			        	  console.log('base64 length',evt.target.result.length);     
    			        	  
    			          }
    			        };
    			      })(file);
    		
    			      reader.readAsDataURL(file);
    			    }
    		
    			    return false;
    		    
    		    
    			}catch(dropE){
    				console.log('DnD error',dropE);
    			}
    		  
    	  }
    	  
    	  
    });
