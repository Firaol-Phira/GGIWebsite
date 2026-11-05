import React from "react";
import Banner from "../../componenets/Banner/Banner"
import CorePillars from "../../componenets/CorePillars/CorePillars"
import CTA from "../../componenets/CTA/CTA"
import Gallery from "../Gallery/Gallery";



function Home() {
  return (
    <div>
  <Banner/>

  <CorePillars/>
  <Gallery/>

  <CTA/>
    </div>
  );
}

export default Home;
