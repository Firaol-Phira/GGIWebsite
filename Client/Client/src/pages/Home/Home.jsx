import React from "react";
import Banner from "../../componenets/Banner/Banner"
import CorePillars from "../../componenets/CorePillars/CorePillars"
import CTA from "../../componenets/CTA/CTA"
import Gallery from "../Gallery/Gallery";
import Projects from "../Projects/Projects";



function Home() {
  return (
    <div>
  <Banner/>
<Projects/>
  <CorePillars/>
  <Gallery/>

  <CTA/>
    </div>
  );
}

export default Home;
