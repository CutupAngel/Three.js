import React from 'react';
import {Link} from 'react-router-dom';
import styled from "styled-components";
import {Play, Stop} from './Play.jsx';
import {randomize} from './Browser.jsx';

/* This defines the actual bar going down the screen */
const StyledSideNav = styled.div`
  position: fixed;     /* Fixed Sidebar (stay in place on scroll and position relative to viewport) */
  height: 100%;
  width: 60px;     /* Set the width of the sidebar */
  z-index: 1;      /* Stay on top of everything */
  background-color: #100; /* Black */
  overflow-x: hidden;     /* Disable horizontal scroll */
  padding-top: 10px;
`;
const StyledNavItem = styled.div`
  height: 30px;
  width: 60px; /* width must be same size as NavBar to center */
  text-align: left; /* Aligns <a> inside of NavIcon div */
  margin-bottom: 0;   /* Puts space between NavItems */
  a {
    color: ${(props) => props.active ? "white" : "#9FFFCB"};
    :hover {
      opacity: 0.7;
      text-decoration: none; /* Gets rid of underlining of icons */
    }  
  }
`;


class SideNav extends React.Component {    
  constructor(props) {
    super(props);
    this.state = {
      activePath: '/',
      items: [
        {
          path: './public/canvas/animated-grid.js',
          name: '1',
          key: 1,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-p5.js',
          name: '2',
          key: 2,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-p5-instance.js',
          name: '3',
          key: 3,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-regl-fullscreen-shader',
          name: '4',
          key: 4,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-scribble-curves.js',
          name: '5',
          key: 5,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-simple-2d.js',
          name: '6',
          key: 6,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-three-basic-cube.js',
          name: '7',
          key: 7,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-three-sphere-shader.js',
          name: '8',
          key: 8,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-three-text-canvas.js',
          name: '9',
          key: 9,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-two-basic-rect.js',
          name: '10',
          key: 10,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-two-bitmap.js',
          name: '11',
          key: 11 ,
          type: 'sketch'
        },
        {
          path: './public/canvas/animated-two-overdraw.js',
          name: '12',
          key: 12,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-10-print.js',
          name: '13',
          key: 13,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-abstract-risograph-print.js',
          name: '14',
          key: 14,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-dot-flower.js',
          name: '15',
          key: 15,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-generative-arcs.js',
          name: '16',
          key: 16,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-generative-silhouette.js',
          name: '17',
          key: 17,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-geometric-3d.js',
          name: '18',
          key: 18,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-gradient.js',
          name: '19',
          key: 19,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-image-processing.js',
          name: '20',
          key: 20,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-in-canvas.js',
          name: '21',
          key: 21 ,
          type: 'sketch'
        },
        {
          path: './public/canvas/canvas-pixel-processing.js',
          name: '22',
          key: 22,
          type: 'sketch'
        },
        {
          path: '/canvas/fullscreen-shader.js',
          name: '.23',
          key: 23,
          type: 'sketch'
        },
        {
          path: './public/canvas/headless-gl.js',
          name: '24',
          key: 24,
          type: 'sketch'
        },
        {
          path: './public/canvas/motion-blur.js',
          name: '25',
          key: 25,
          type: 'sketch'
        },
        {
          path: './public/canvas/pen-plotter-circles.js',
          name: '26',
          key: 26,
          type: 'sketch'
        },
        {
          path: './public/canvas/pen-plotter-cubic-disarray.js',
          name: '27',
          key: 27,
          type: 'sketch'
        },
        {
          path: './public/canvas/pen-plotter-patchwork.js',
          name: '28',
          key: 28,
          type: 'sketch'
        },
        {
          path: './public/canvas/shader.js',
          name: '29',
          key: 29,
          type: 'sketch'
        },
        {
          path: './public/canvas/church2.jpg',
          name: '30',
          key: 30,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/eye.jpg',
          name: '31',
          key: 31,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/fractal1.jpg',
          name: '32',
          key: 32,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/fractal2.jpg',
          name: '33',
          key: 33,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/map7.jpg',
          name: '34',
          key: 34,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/nature1.jpg',
          name: '35',
          key: 35,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/pat1.jpg',
          name: '36',
          key: 36,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/pentagram.jpg',
          name: '37',
          key: 37,
          type: 'color-mixer'
        },
        {
          path: './public/canvas/snowflake.jpg',
          name: '38',
          key: 38,
          type: 'color-mixer'
        }
      ]
    }  
  }
  
  onItemClick(path, type) {
    var element = document.getElementsByTagName("canvas"), index;
    for (index = element.length - 1; index >= 0; index--) {
      if (element[index].id != "canvas") {
        element[index].parentNode.removeChild(element[index]);
      }
    }
    if (type === "sketch") {
      this.setState({ activePath: path });
      var canvasID = document.getElementById("canvas");
      canvasID.setAttribute("style", "display: none;");
      let script = document.getElementById("dynamic");
      if(script != null) {
          script.remove();
          script = document.createElement("script");
          script.setAttribute("id", "dynamic");
          script.src = path;
          script.async = true;    
          document.body.appendChild(script);
      }
    } else if (type === "color-mixer") {
      var canvasID = document.getElementById("canvas");
      canvasID.setAttribute("style", "display: block;");
      // var sketchScript = document.getElementById("dynamic");
      // sketchScript.src = "";
      // var scriptDiv = document.getElementById("scriptDiv");
      // var canvastag = document.createElement("canvas");
      // canvastag.setAttribute("id", "canvas");
      // canvastag.setAttribute("class", "noselect");
      // canvastag.setAttribute("style", "position: absolute;");
      // canvastag.setAttribute("width", "2560");
      // canvastag.setAttribute("height", "1440");
      // scriptDiv.appendChild(canvastag);
      randomize(path);
    }
  }

  render() {
      const { items, activePath } = this.state;
      return (
          <div>
              <StyledSideNav>
                  {
                  items.map((item) => {
                      return (
                      <NavItem path={item.path} name={item.name} type={item.type} onItemClick={this.onItemClick.bind(this)} active={item.path === activePath} key={item.key}/>
                      )
                  })
                  }
              </StyledSideNav>
          </div>
      );
  }
  componentDidMount() {
    let url = document.location.href;
    if (url.indexOf("leftEar") == -1) {
      document.location.href="/play?leftEar=200&rightEar=240";
    }  
    Play();
  }
}

class NavItem extends React.Component {
    constructor(props) {
      console.log(props);
      super(props);
      this.state = {
        path: this.props.path,
        type: this.props.type,
        onItemClick : this.props.onItemClick
      }
    }
    handleClick() {
        console.log(this.state.path);
        console.log(this.state.type);
        const { path, onItemClick, type } = this.props;
        this.state.onItemClick(this.state.path, this.state.type);
    }
    render() {
        const { active } = this.props;
        return (
            <StyledNavItem active={active}>
                <button to='' onClick={this.handleClick.bind(this)}>
                    {this.props.name}
                </button>
            </StyledNavItem>
        );
    }
}

export class Sidebar extends React.Component {
  render() {
    return (
        <SideNav></SideNav>
    );
  }
}