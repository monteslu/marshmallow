/*
 * 
Copyright 2011 Luis Montes

http://azprogrammer.com 

 */    



    dojo.require('mwe.box2d.Box');
    dojo.require('mwe.box2d.CircleEntity');    
    dojo.require('mwe.box2d.RectangleEntity');
    dojo.require('mwe.box2d.PolygonEntity');
    
    dojo.require('mwe.GameCore');
    dojo.require('mwe.ResourceManager');
    dojo.require('mwe.ui.DNDFileController');
    
	var debug = false;
	
	if(localStorage && localStorage.debug == 'y'){
		debug = true;
	}
	
     
    var SCALE = 30.0;
    var NULL_CENTER = {x:null, y:null};
    var MAX_POLY_SIDES = 6;
    
    var ballToHit = null;
    var ballToMove = null;
    var mouseDownPt = null;
    var mouseMovePt = null;
    var maxImpulse = 25;
    var rm = null;
    
    var backImg = null;
    var shots = 0;
    
    
    var ballRadius = 0.4;
    var tableHeight = 385;
    var cueStart = {x:508/SCALE,y:192/SCALE};
    
    
    
    //tool stuff
    var tool = 'polygon';
    var currentGeom = null;
    var xdisp,ydisp;
    var geomId = 30;
    var extraObjs = [];
    var dnd;
    var showHidden = true;
    
    //first ball starting point
    var sp = {x:192/SCALE,y:192/SCALE};
    //first balls starting point in crazy mode x offset
    var spczx = (230 - 190)/SCALE;
    
    //ball exit
    var be = {x:70/SCALE,y:400/SCALE};
    
    var stats = new Stats();

    // Align top-left
    var stats = new Stats();

    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right    = '0px';
    stats.domElement.style.bottom   = '0px';

	var prefMode = 8;
	if(localStorage && localStorage.prefMode){
		prefMode = localStorage.prefMode;	
	}
    
    
    
    var zones = [];


    var stickStartColor = {r:254,g:232,b:214};
    var stickEndColor = {r:255,g:0,b:0};
    var stickDistance = 0;
   
    
    dojo.declare("RectangleZone", [mwe.box2d.RectangleEntity], {
        impulseAngle: 0,
        impulseForce: 0.5,
        color: 'rgba(255,0,0,0.2)',
    	constructor: function(/* Object */args){
            dojo.safeMixin(this, args);
        },
        applyImpulse: function(entity,box){
        	box.applyImpulse(entity.id, this.impulseAngle, this.impulseForce  ); 
        },
        inZone: function(entity){
        	if(entity){
        		return ((entity.x > (this.x - this.halfWidth)) && (entity.y > (this.y - this.halfHeight)) && (entity.x < (this.x + this.halfWidth)) && (entity.y < (this.y + this.halfHeight)));      
        	}else{
        		return false;
        	}
        }
    });
    
    
      dojo.declare("Ball", [mwe.box2d.CircleEntity], {
        constructor: function(/* Object */args){
            dojo.safeMixin(this, args);
        },
        draw: function(ctx){
          var radius = this.radius * SCALE;
          var sx = this.x * SCALE;
          var sy = this.y * SCALE;
          
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2, true);          
          ctx.closePath();
          ctx.fill();
         
          //ctx.strokeStyle = '#000000';
          
          
          if(this.id != 0){
        	  /*
        	  ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(this.x * SCALE, this.y * SCALE, this.radius * SCALE * 0.4, 0, Math.PI * 2, true);          
              ctx.closePath();
              ctx.fill();
        	  */
	          ctx.save();
	          ctx.translate(sx, sy);
	          ctx.rotate(this.angle);
	          ctx.translate(-sx, -sy);
	         
			 ctx.fillStyle = '#FFFFFF';
			 ctx.font = "8pt Arial";
			 var textXOffset;
			 
			 if(this.id < 10){
				textXOffset = sx - radius/2 + 3;
			 }else{
				textXOffset = sx - radius/2;
			 }
			  
			  ctx.fillText(this.id,textXOffset,sy - radius /2 + 10);
			  
	          if(this.striped){
				  
		          ctx.beginPath();
	              ctx.arc(sx, sy, radius, Math.PI * 1.77, Math.PI * 1.22 , true);          
	              ctx.closePath();
	              ctx.fill();
	              
	              ctx.beginPath();
	              ctx.arc(sx, sy, radius, Math.PI * 0.77, Math.PI * 0.22 , true);          
	              ctx.closePath();
	              ctx.fill();
	          }	          
	          
			  
			  
	          ctx.restore();
	          
			  /*
	          ctx.strokeStyle = '#000000';
	          ctx.beginPath();
	          ctx.arc(this.x * SCALE, this.y * SCALE, this.radius * SCALE * 0.4, 0, Math.PI * 2 , true);          
	          ctx.closePath();
	          ctx.stroke();
	          */
	          
          }
          
          ctx.strokeStyle = '#000000';
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2, true);          
          ctx.closePath();
          ctx.stroke();
          
        }
       });
    
      
    var world = {};
    var worker = null;
    var bodiesState = null;
    var box = null;
    


  var isPointInPoly = function(poly, pt){
		for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
			((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
			&& (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
			&& (c = !c);
		return c;
	};
	
	var createPoly = function(){
		
		if(currentGeom && currentGeom.length > 2){
			geomId++;
			var poly = new mwe.box2d.PolygonEntity({id: geomId, x: 0, y: 0, points: currentGeom,staticBody: true, hidden: true});
			
			for(var j = 0; j < poly.points.length; j++){
				poly.points[j].x = poly.points[j].x / SCALE;
				poly.points[j].y = poly.points[j].y / SCALE;
     		  }

	    	  
	    	  
	       world[geomId] = poly;
			
			
		  box.addBody(poly); 
		  addExtraObj(poly);
			
		}
	};
	
	var addExtraObj = function(obj){
		extraObjs.push(obj);
		dojo.byId('output').innerHTML = JSON.stringify({objs:extraObjs});
	}
	
	var orderRectPts = function(pts){
		var retVal = [];
		var pt1,pt2;
		if(pts[1].x < pts[0].x){
			pt1 = pts[1];
			pt2 = pts[0];
		}else{
			pt1 = pts[0];
			pt2 = pts[1];
		}
		retVal.push(pt1);
		retVal.push(pt2);
		return retVal;
	};
	
	   var createRectCommon = function(){
		   if(currentGeom && currentGeom.length == 2){
				geomId++;
				
				var pts = orderRectPts(currentGeom);
				var x = ((pts[1].x - pts[0].x)/2 + pts[0].x)/SCALE;
				var y = ((pts[1].y - pts[0].y)/2 + pts[0].y)/SCALE;
				var hw = ((pts[1].x - pts[0].x)/2 )/SCALE;
				var hh = ((pts[1].y - pts[0].y)/2 )/SCALE;
				
				return {id: geomId, x: x, y: y, halfHeight: hh, halfWidth: hw,staticBody: true, hidden: true};
		   }
	   };
	   
	
   var createRect = function(){
		
	   var obj = createRectCommon();
		
		if(obj){
			obj.type = 'Rectangle';
			var rect = new mwe.box2d.RectangleEntity(obj);
			
	    	  
	       world[geomId] = rect;
			
			
		  box.addBody(rect); 
		  addExtraObj(rect);
			
		}
	};
	

	
   var createRectZone = function(){
	   var obj = createRectCommon();
		
		if(obj){
			obj.type = 'RectangleZone';
			obj.impulseAngle = 90;
			
			var rect = new RectangleZone(obj);
	    	  
	       world[geomId] = rect;
			
		 // box.addBody(rect); 
		  addExtraObj(rect);
		  zones.push(rect);
			
		}
	};
	
   var createCircle = function(){
		
		if(currentGeom && currentGeom.length == 2){
			geomId++;
			
			var dist =  getDistance(currentGeom[0],currentGeom[1]);
			
			var circle = new mwe.box2d.CircleEntity({id: geomId, x: currentGeom[0].x/SCALE, y: currentGeom[0].y/SCALE, radius: dist/SCALE, staticBody: true, hidden: true});
			
	    	  
	       world[geomId] = circle;
			
			
		  box.addBody(circle); 
		  addExtraObj(circle);
			
		}
	};
	
	 
     

    
    //get coordinates in box2d space
    var getGfxMouse = function(evt){
  	  var coordsM = dojo.coords(dojo.byId('canvas'));
  	  return {x: (evt.clientX - coordsM.x) / SCALE, y: (evt.clientY - coordsM.y) / SCALE};
    };
    
  //get coordinates in DOM space
    var getGfxMousePixels = function(evt){
  	  var coordsM = dojo.coords(dojo.byId('canvas'));
  	  return {x: (evt.clientX - coordsM.x) , y: (evt.clientY - coordsM.y)};
    };
    
    var getColorFade = function(start,end,percent){
    	var r = Math.floor((end.r - start.r) * percent) + start.r;
    	var g = Math.floor((end.g - start.g) * percent) + start.g;
    	var b = Math.floor((end.b - start.b) * percent) + start.b;
    	return {r:r,g:g,b:b};
    };
    
    
    var intersect = function (s1, s2,radiiSquared) {

		var distance_squared = Math.pow(s1.x  - s2.x,2) + Math.pow(s1.y - s2.y,2);
		//var radii_squared = 1; //Math.pow(s1.collisionRadius + s2.collisionRadius,2);
		return distance_squared < radiiSquared;  // true if intersect
		
	};
	
	var getCollidedBall = function(mouse){
		for (var i = 0; i< initialState.length; i++) {
			if(intersect(mouse,world[i],0.5)){
				return world[i];
				
			}
	        
	     }
		return null;
	};
    
	var getDegrees = function(center, pt){
		
		//same point
		if((center.x == pt.x) && (center.y == pt.y)){
			return 0;
		}else if(center.x == pt.x){
			if(center.y < pt.y){
				return 180;
			}else{
				return 0;
			}
		}else if(center.y == pt.y){
			if(center.x > pt.x){
				return 270;
			}else{
				return 90;
			}
		}else if((center.x < pt.x) && (center.y > pt.y)){
			//quadrant 1
			console.log('quad1',center.x,center.y,pt.x,pt.y,'o',pt.x - center.x,'a',pt.y - center.y);
			return Math.atan((pt.x - center.x)/(center.y - pt.y)) * (180 / Math.PI);
		}
		else if((center.x < pt.x) && (center.y < pt.y)){
			//quadrant 2
			console.log('quad2',center.x,center.y,pt.x,pt.y);
			return 90 + Math.atan((pt.y - center.y)/(pt.x - center.x)) * (180 / Math.PI);
		}
		else if((center.x > pt.x) && (center.y < pt.y)){
			//quadrant 3
			console.log('quad3',center.x,center.y,pt.x,pt.y);
			return 180 + Math.atan((center.x - pt.x)/(pt.y - center.y)) * (180 / Math.PI);
		}
		else{
			//quadrant 4
			console.log('quad4',center.x,center.y,pt.x,pt.y);
			return 270 + Math.atan((center.y - pt.y)/(center.x - pt.x)) * (180 / Math.PI);
		}
		
	};
	
	var getDistance = function(a,b){
		return Math.sqrt((a.x - b.x)*(a.x - b.x) + (a.y - b.y)*(a.y - b.y));
		
	};
	
	var ptOnTable = function(pt){
		
		if((pt.x > (38 / SCALE)) && (pt.x < (661 / SCALE)) && (pt.y > (38 / SCALE)) && (pt.y < (347 / SCALE)) ){
			return true;
		}else{
			return false;
		}
	};
	

	
	var clearTable = function(){
		for(var i = 0; i < 16; i++){
			var entity = world[i];
			box.removeBody(i);
			entity.y = be.y;
			entity.x = be.x + (2 * i * ballRadius) + (2*ballRadius);
			entity.onTable = false;
			box.addBody(entity);        	
		}
		resetShots();
	};	
	var rack8Ball = function(){
		if(localStorage){
			localStorage.prefMode = 8;
		}
		prefMode = 8;
	
	
		for(var i = 0; i < 16; i++){
			var entity = world[i];
			box.removeBody(i);
			entity.x = eightBallLocs[i].x;
			entity.y = eightBallLocs[i].y;
			entity.onTable = true;
			box.addBody(entity);        				
		}
		resetShots();
	};
	var rack9Ball = function(){
	
		if(localStorage){
			localStorage.prefMode = 9;
		}
		prefMode = 9;
	
		for(var i = 0; i < 10; i++){
			var entity = world[i];
			box.removeBody(i);
			entity.x = nineBallLocs[i].x;
						
			entity.y = nineBallLocs[i].y;
			entity.onTable = true;
			box.addBody(entity);        				
		}
		for(var i = 10; i < 16; i++){
			var entity = world[i];
			box.removeBody(i);
			entity.y = be.y;
			entity.x = be.x + (2 * i * ballRadius) + (2*ballRadius);
			entity.onTable = false;
			box.addBody(entity);       				
		}
		resetShots();
	};
	
	
	var getTool = function(){
		var tools = dojo.byId('toolForm').tool;
		dojo.forEach(tools,function(aTool){
			if(aTool.checked){
				tool = aTool.value;				
			}
		})
		
		if(tool == 'polygon'){
			dojo.byId('shapeDone').style.display = '';
		}else{
			dojo.byId('shapeDone').style.display = 'none';
		}
		

		
		return tool;
	};
	
	var incrementShots = function(){
		shots++;
		dojo.byId('shotsDisp').innerHTML = shots;
	};
	
	var resetShots = function(){
		shots = 0;
		dojo.byId('shotsDisp').innerHTML = shots;
	};
	
	var insideCanvas = function(pt){
		if((pt.x < 0) || (pt.x >  game.width) || (pt.y < 0) || (pt.y > game.height)){
			return false;
		}else{
			return true;
		}
	};
	
	var eightBallLocs = [
	                       {id:0,x:cueStart.x, y:cueStart.y},
	                       {id:1,x: sp.x , y: sp.y},
	                       {id:2,x: sp.x - (2 * ballRadius) , y:sp.y - ballRadius},
	                       {id:3,x: sp.x - (4 * ballRadius) , y:sp.y + (2 * ballRadius)},
	                       {id:4,x: sp.x - (6 * ballRadius) , y:sp.y - (3 * ballRadius)},
	                       {id:5,x: sp.x - (8 * ballRadius) , y:sp.y + (4 * ballRadius)},
	                       {id:6,x: sp.x - (8 * ballRadius) , y:sp.y - (2 * ballRadius)},
	                       {id:7,x: sp.x - (6 * ballRadius) , y:sp.y + ballRadius},
	                       {id:8,x: sp.x - (4 * ballRadius) , y:sp.y},
	                       {id:9,x: sp.x - (2 * ballRadius) , y:sp.y + ballRadius},
	                       {id:10,x: sp.x - (4 * ballRadius) , y:sp.y - (2 * ballRadius)},
	                       {id:11,x: sp.x - (6 * ballRadius) , y:sp.y + (3 * ballRadius)},
	                       {id:12,x: sp.x - (8 * ballRadius) , y:sp.y - (4 * ballRadius)},
	                       {id:13,x: sp.x - (8 * ballRadius) , y:sp.y + (2 * ballRadius)},
	                       {id:14,x: sp.x - (6 * ballRadius) , y:sp.y - ballRadius},
	                       {id:15,x: sp.x - (8 * ballRadius) , y:sp.y}
	                       ];
	
	var nineBallLocs = [
	                       {id:0,x:cueStart.x, y:cueStart.y},
	                       {id:1,x: sp.x , y: sp.y},
	                       {id:2,x: sp.x - (2 * ballRadius) , y:sp.y - ballRadius},
	                       {id:3,x: sp.x - (2 * ballRadius) , y:sp.y + ballRadius},
	                       {id:4,x: sp.x - (4 * ballRadius) , y:sp.y - (2 * ballRadius)},
	                       {id:5,x: sp.x - (4 * ballRadius) , y:sp.y + (2 * ballRadius)},
	                       {id:6,x: sp.x - (6 * ballRadius) , y:sp.y - ballRadius},
	                       {id:7,x: sp.x - (6 * ballRadius) , y:sp.y + ballRadius},
	                       {id:8,x: sp.x - (8 * ballRadius) , y:sp.y},
	                       {id:9,x: sp.x - (4 * ballRadius) , y:sp.y}
	                       ];
	
	

	
	var initialState= [
					  new Ball({id:0,color:"#FFFFFF",striped:false}),
					  new Ball({id:1,color:"#DDDD00",striped:false}),
					  new Ball({id:2,color:"#0000CC",striped:false}),
					  new Ball({id:3,color:"#FF0000",striped:false}),
					  new Ball({id:4,color:"#880088",striped:false}),
					  new Ball({id:5,color:"#FF6600",striped:false}),
	                  
					  new Ball({id:6,color:"#007700",striped:false}),
					  new Ball({id:7,color:"#770000",striped:false}),
					  new Ball({id:8,color:"#000000",striped:false}),
					  new Ball({id:9,color:"#DDDD00",striped:true}),
					  new Ball({id:10,color:"#0000CC",striped:true}),
	                  
					  new Ball({id:11,color:"#FF0000",striped:true}),
					  new Ball({id:12,color:"#880088",striped:true}),
					  new Ball({id:13,color:"#FF6600",striped:true}),
					  new Ball({id:14,color:"#007700",striped:true}),
					  new Ball({id:15,color:"#770000",striped:true}),
	                  
	                  

	                  
	                  
	                  ];
	
	
    dojo.ready(function() {
        if(debug){
			dojo.place(stats.domElement,dojo.body(),'last');      
		}
      
        xdisp = dojo.byId('xdisp');
        ydisp = dojo.byId('ydisp');
        
    	rm = new mwe.ResourceManager();
    	backImg = rm.loadImage('pool_table_700x385.png');
    	
    	
    	
    	
    	for (var i = 0; i< initialState.length; i++) {
    	
    	  var iS = initialState[i];
    	  
    	  if(i < 16){
    		iS.radius = ballRadius;
    	  	iS.linearDamping = 0.6;
    	  	iS.angularDamping = 0.5;
    	  	iS.restitution = 0.9;
    	  }
    	  

    	  
    	  if(iS.points){
    		  for(var j = 0; j < iS.points.length; j++){
    			  iS.points[j].x = iS.points[j].x / SCALE;
    			  iS.points[j].y = iS.points[j].y / SCALE;
    		  }
    	  }
    	  
    	  if((i > 15) && (i < 28)){
    		  iS.x = 0;
    		  iS.y = 0;
    	  }
    	  
    	  
          world[i] = iS;
      }
    	
    	

      dojo.forEach(dojo.byId('toolForm').tool,function(aTool){
    	  
    	dojo.connect(aTool,'onchange',function(e){
    		currentGeom = null;
    		tool = getTool();      	
    		console.log(tool);
    	    	
      	});
      });
    	
      
      dojo.connect(document,'mouseup',function(e){
    	  mouseDownPt = null;
    	  var pt = getGfxMouse(e);
    	  
    	  
    	  if(ballToHit){
    		  
    			var degrees =  getDegrees(ballToHit,pt); //theta * (180 / Math.PI);
    			console.log('degrees',degrees);
    			
				box.applyImpulse(ballToHit.id, degrees + 90, Math.min( getDistance(ballToHit,pt) * 3, maxImpulse )  );
				incrementShots();
				ballToHit = null;
			  
    	  }
    	      	  
    	  if(ballToMove){
    		  
    		  if(ptOnTable(pt)){
    			box.removeBody(ballToMove.id);
    			ballToMove.y = pt.y;
    			ballToMove.x = pt.x;
    			ballToMove.onTable = true;
  				box.addBody(ballToMove);  
    		  }
    		  
    		  ballToMove = null;
    	  }
    	  
    	  if(!ballToHit && !ballToMove){
    		  var mp = getGfxMousePixels(e);
    		  if(insideCanvas(mp)){
		    	  if(tool == 'polygon'){
		    		currentGeom = currentGeom || [];
		    		currentGeom.push(mp);
		    		if(currentGeom.length > 5){
		    			createPoly();
		    			currentGeom = null;
		    		}
		    	  }else if(tool == 'rectangle'){
		    		  if(currentGeom && currentGeom.length ==1){
		    			  currentGeom.push(mp);
		    			  createRect();
			    		  currentGeom = null;
		    		  }
		    	  }
		    	  else if(tool == 'rectangleZone'){
		    		  if(currentGeom && currentGeom.length ==1){
		    			  currentGeom.push(mp);
		    			  createRectZone();
			    		  currentGeom = null;
		    		  }
		    	  }else if(tool == 'circle'){
		    		  if(currentGeom && currentGeom.length ==1){
		    			  currentGeom.push(mp);
		    			  createCircle();
			    		  currentGeom = null;
		    		  }
		    	  }
    		  }else{
    			  console.log('outside',mp);
    		  }
    	  }
    	  
    	        
      });
      
      
      
      

      
      
      
      dojo.connect(document,'mousemove',function(e){
    	  mouseMovePt = getGfxMouse(e);
    	  if(mouseDownPt){
    	  	mouseDownPt = mouseMovePt;
    	  }
    	  xdisp.innerHTML = Math.floor(mouseMovePt.x * SCALE);
    	  ydisp.innerHTML = Math.floor(mouseMovePt.y * SCALE);
      });
      
      dojo.connect(dojo.byId('canvas'),'mousedown',function(e){
    	  
    	  
    	  for (var id in world) {
  	        var entity = world[id];
  	        entity.selected = false;
  	  	  }
    	  
    	  var pt = getGfxMouse(e);
    	  mouseDownPt = pt;
    	  console.log('mouse',pt.x,pt.y);
    	  var selectedBall = getCollidedBall(pt);
    	  
    	  if(selectedBall){
    		  if(selectedBall.onTable){
    		  	ballToHit = selectedBall;
    		  	ballToHit.selected = true;
    		  }else{
    			ballToMove = selectedBall;
    			ballToMove.selected = true;
    		  }    		  
    	  }else{
    		  var mp = getGfxMousePixels(e);
    		  if(insideCanvas(mp)){
    			  
	    		  if(tool == 'rectangle' || tool == 'rectangleZone'){
	    			  console.log('start rect',mp);
	    			  currentGeom = [];
	    			  currentGeom.push(mp);
	    		  }
	    		  else if(tool == 'circle'){
	    			  console.log('start circle',mp);
	    			  currentGeom = [];
	    			  currentGeom.push(mp);
	    		  }
    		  }
    		  
    	  }    	 
    	        
      });
      
      
      dojo.connect(dojo.byId('clearBtn'),'onclick',function(e){
    	  clearTable();
      });
      dojo.connect(dojo.byId('rack8Btn'),'onclick',function(e){
    	  rack8Ball();
      });
      dojo.connect(dojo.byId('rack9Btn'),'onclick',function(e){
    	  rack9Ball();
      });

      dojo.connect(dojo.byId('shapeDone'),'onclick',function(e){
    	  createPoly();
    	  currentGeom = null;
      });
      
dojo.connect(dojo.byId('load'),'onclick',function(e){
    	  try{
    	      
    	      var objStr = dojo.byId('output').value;
    	      console.log(objStr);
    	      
    	      var jsobj = JSON.parse(objStr);
    		  
    		  console.log(jsobj);
    	      
    	      if(extraObjs){
    	        dojo.forEach(extraObjs,function(obj){
    	          box.removeBody(obj.id);
    	        });
    	        extraObjs = [];
    	        
    	      }
    	      
    		  
    		  
    		  if(jsobj && jsobj.objs){
    		    dojo.forEach(jsobj.objs,function(shape){
    		        console.log(shape.type);
    		        geomId++;
    		        
    		        if(shape.type == 'Polygon'){
    		        
    		            var b2dshape = new mwe.box2d.PolygonEntity(shape);
    		            b2dshape.id = geomId;
    		            box.addBody(b2dshape); 
		                extraObjs.push(b2dshape);
		                //world[b2dshape.geomId] = b2dshape;
    		        }
    		    });
    		  }
    		  
		  
    	  }catch(e){
    		  console.info('error loading json',e);
    	  }
      });
      
      
      
      dojo.connect(dojo.byId('showHidden'),'onchange',function(e){
    	  showHidden = dojo.byId('showHidden').checked;    	  
      });
      
      
      dojo.connect(document,'onselectstart',function(e){
    	  e.preventDefault();
    	  return false;
      });
      
       
      dnd = new mwe.ui.DNDFileController({id:'canvas',
    	drop: function(e){
  		  try{
			  
      		
			    var files = e.dataTransfer.files;
		
			    //only care about 1 image
			    if(files && files.length == 1 && files[0].type.match(/image.*/)){
			    	var file = files[0];
			    	var reader = new FileReader();
			    	
			    	reader.onerror = function(evt) {
				         console.log('Error code: ' + evt.target.error.code);
				      };
				      
				    reader.onload = (function(aFile) {
				        return function(evt) {
				          if (evt.target.readyState == FileReader.DONE) {
				         	  
				        	  //console.log('evt',evt);
				        	  console.log('base64 length',evt.target.result.length);     
				        	  backImg.src = evt.target.result;
				          }
				        };
				      })(file);
				      
				    reader.readAsDataURL(file);
			    	
			    	
			    }
			    
			}catch(dropE){
				console.log('DnD error',dropE);
			}
    	}        
      });
      
      
      game = new mwe.GameCore({
          canvasId: 'canvas',
          resourceManager: rm,
          update : function(elapsedTime){
              box.update();
              bodiesState = box.getState();
              
              for (var id in bodiesState) {
                var entity = world[id];
                if (entity){
                	try{
                		entity.update(bodiesState[id]);
                	}catch(eu){
                		console.log(entity, eu);
                	}
                		
                	
            		for(var j = 0;  j < zones.length; j++){
                    	if(zones[j].inZone(entity)){
                    	  zones[j].applyImpulse(entity,box);
                      	   
                        }
                	}
            
                }
                	
              }
              if(debug){
				stats.update();
			  }
          },
          draw: function(ctx){
        	  ctx.lineWidth = 1;
              ctx.clearRect ( 0 , 0 , this.width, this.height);
              ctx.drawImage(backImg,0, 0, this.width, backImg.height);
              
              
              if(ballToHit && mouseDownPt){
            	  var impPerc = (Math.min(getDistance(ballToHit,mouseDownPt) * 3, maxImpulse) * 1.0) / maxImpulse;
            	  var colorFade  = getColorFade(stickStartColor,stickEndColor,impPerc);
            	  var lineWidth = ctx.lineWidth;
            	  ctx.lineWidth = 3;
            	  ctx.beginPath();
            	  ctx.moveTo(ballToHit.x * SCALE, ballToHit.y * SCALE);
            	  ctx.lineTo(mouseDownPt.x * SCALE, mouseDownPt.y * SCALE);
            	  ctx.strokeStyle = 'rgb('+ colorFade.r + ',' + colorFade.g + ','+ colorFade.b + ')'; 
            	  ctx.stroke();
            	  ctx.closePath();
            	  ctx.lineWidth = lineWidth;
              }
              
              for (var id in world) {
                  var entity = world[id];
                  if(!entity.hidden || showHidden){
                  	entity.draw(ctx);
                  }
                }
              
              if(ballToMove && mouseDownPt){
            	  var lineWidth = ctx.lineWidth;
            	  ctx.lineWidth = 5;
            	  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                  ctx.beginPath();
                  ctx.arc(mouseDownPt.x * SCALE, mouseDownPt.y * SCALE, ballRadius * SCALE, 0, Math.PI * 2 , true);          
                  ctx.closePath();
                  ctx.stroke();
            	  ctx.lineWidth = lineWidth;
              } 
              
              
              
              if(tool == 'polygon' && currentGeom){
            	 if(currentGeom.length > 0){
            		  var lineWidth = ctx.lineWidth;
                	  ctx.lineWidth = 1;
                	  ctx.beginPath();
            		  for(var i =1; i < currentGeom.length; i++){
            			  
                    	  ctx.moveTo(currentGeom[i-1].x, currentGeom[i-1].y );
                    	  ctx.lineTo(currentGeom[i].x, currentGeom[i].y);
            		  }
            		  
            		  if(mouseMovePt){
            			  ctx.moveTo(currentGeom[currentGeom.length -1].x, currentGeom[currentGeom.length -1].y );
            			  ctx.lineTo(mouseMovePt.x * SCALE, mouseMovePt.y * SCALE);
            		  }
            		  
                	  ctx.strokeStyle = 'red'; 
                	  ctx.stroke();
                	  ctx.closePath();
                	  ctx.lineWidth = lineWidth;
            	  }
            	  
            	  
              }
              else if((tool == 'rectangle' || tool == 'rectangleZone') && currentGeom){
             	 if(currentGeom.length > 0){
           		  var lineWidth = ctx.lineWidth;
               	  ctx.lineWidth = 1;
           
           		  var pts = orderRectPts([currentGeom[0],{x:mouseMovePt.x * SCALE,y:mouseMovePt.y *SCALE}]);
            	  ctx.strokeStyle = 'red'; 
            	  
           		  ctx.strokeRect(pts[0].x,pts[0].y, pts[1].x -pts[0].x, pts[1].y -pts[0].y);
           		  
           
               	  ctx.lineWidth = lineWidth;
             	 }
           	  }
             else if(tool == 'circle' && currentGeom){
              	 if(currentGeom.length > 0){
              		  var lineWidth = ctx.lineWidth;
                  	  ctx.lineWidth = 1;
              
                  	  var dist =  getDistance(currentGeom[0],{x:mouseMovePt.x * SCALE,y:mouseMovePt.y *SCALE});
               	      ctx.strokeStyle = 'red'; 
               	       ctx.beginPath();
	                   ctx.arc(currentGeom[0].x, currentGeom[0].y, dist, 0, Math.PI * 2, true);          
	                   ctx.closePath();
	                   ctx.stroke();
              
                  	  ctx.lineWidth = lineWidth;
              	  }
             }
          }
          
      });
      
      box = new mwe.box2d.Box({intervalRate:60, adaptive:false, width:game.width, height:game.height, scale:SCALE,gravityY:0});
      box.setBodies(world);
      
	    if(prefMode == 9){
			rack9Ball();
		}else{
			rack8Ball();
		}
	  
      game.run();
      
    });
