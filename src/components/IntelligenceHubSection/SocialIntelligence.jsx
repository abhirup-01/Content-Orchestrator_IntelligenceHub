import React, { useEffect, useMemo, useRef, useState } from "react";
import "./IntelligenceCss/IntelligenceDashboard.css";
import {  TrendingUp, Share2, MessageCircle, ThumbsUp, Clock, Minus, ThumbsDown, Sparkles } from 'lucide-react';

export default function SocialIntelligence() {

  const [activeTab, setActiveTab] = useState("Platforms");

// 2) Tab list (easy to add/remove)
const tabs = ["Platforms", "Topics", "Top Mentions"];

 return (
<div className="ihub-card ihub-intelCard">
  <div className="ihub-intelHead">
    <div className="ihub-intelTitle">
    <Share2 size={24} className="h-1 w-1 mr-2 ihub-social-icon" style={{color: "#a855f7"}}/>
      <div>
        <div className="ihub-web-ciName">Social Intelligence</div>
        <div className="ihub-web-ciSubtitle">Social listening insights for all audiences</div>
      </div>
    </div>
  </div>

  {/* mini stats */}
  <div className="ihub-miniRow">
    <div className="ihub-web-kpi-return">
    <div className='mb-2'>  <MessageCircle size={19} className="h-1 w-1 mr-2 ihub-web-return"/></div>
      <div className="ihub-miniValue ihub-web-return">1,000</div>
      <div className="ihub-miniLabel ihub-web-return">Total Mentions</div>
    </div>
    <div className="ihub-web-kpi-page">
    <div className='mb-2'>  <ThumbsUp size={19} className="h-1 w-1 mr-2 ihub-web-page"/></div>
      <div className="ihub-miniValue ihub-web-page">34%</div>
      <div className="ihub-miniLabel ihub-web-page">Positive Sentiment</div>
    </div>
    <div className="ihub-web-kpi-avg">
    <div className='mb-2'>  <TrendingUp size={19} className="h-1 w-1 mr-2 ihub-web-avg"/></div>
      <div className="ihub-miniValue ihub-web-avg">3</div>
      <div className="ihub-miniLabel ihub-web-avg">Trending topics</div>
    </div>
    <div className="ihub-web-kpi-active">
    <div className='mb-2'>  <Share2 size={19} className="h-1 w-1 mr-2 ihub-web-active"/></div>
      <div className="ihub-miniValue ihub-web-active">7</div>
      <div className="ihub-miniLabel ihub-web-active">Platforms</div>
    </div>
  </div>

  {/* tabs */}
  {/* <div className="ihub-tabs">
    <button className="ihub-tab active">Platforms</button>
    <button className="ihub-tab">Topics</button>
    <button className="ihub-tab">Top Mentions</button>
  </div> */}
   <div className="ihub-web-card ihub-web-panel">
   <div className="ihub-soc-tabs">
{tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`ihub-soc-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
            >
              {tab}
            </button>
          ))}

   </div>
   </div>

   {activeTab === "Platforms" ? (
<div>
  <div className="ihub-platform">
    <div className="ihub-platformHead">
      <div className="ihub-platformName">Twitter/X</div>
      <span className="ihub-pillLite">146 mentions</span>
    </div>

    <div className="ihub-sentRow"> 
    <div className="ihub-sentLeft">
        <ThumbsUp size={13} className="ihub-sentIcon-pos" />
        <span className="ihub-sentLabel pos">Positive</span>
      </div>
      <div className="ihub-barTrack">
        <span className="ihub-barFill" style={{ width: "34%" }}></span>
      </div>
      <span className="ihub-sentPct pos">34%</span>
    </div>
    <div className="ihub-sentRow">
    <div className="ihub-sentLeft">
        <Minus size={13} className="ihub-sentIcon-neu" />
        <span className="ihub-sentLabel neu">Neutral</span>
      </div>
      <div className="ihub-barTrack">
        <span className="ihub-barFill" style={{ width: "36%" }}></span>
      </div>
      <span className="ihub-sentPct neu">36%</span>
    </div>
    <div className="ihub-sentRow">
    <div className="ihub-sentLeft">
        <ThumbsDown size={13} className="ihub-sentIcon-neg" />
        <span className="ihub-sentLabel neg">Negative</span>
      </div>
      <div className="ihub-barTrack">
        <span className="ihub-barFill" style={{ width: "30%" }}></span>
      </div>
      <span className="ihub-sentPct neg">30%</span>
    </div>
  </div>

  <div className="ihub-platform">
    <div className="ihub-platformHead">
      <div className="ihub-platformName">TikTok</div>
      <span className="ihub-pillLite">144 mentions</span>
    </div>

    <div className="ihub-sentRow">
    <div className="ihub-sentLeft">
        <ThumbsUp size={13} className="ihub-sentIcon-pos" />
        <span className="ihub-sentLabel pos">Positive</span>
      </div>
      <div className="ihub-barTrack">
        <span className="ihub-barFill" style={{ width: "35%" }}></span>
      </div>
      <span className="ihub-sentPct pos">35%</span>
    </div>
    <div className="ihub-sentRow">
    <div className="ihub-sentLeft">
        <Minus size={13} className="ihub-sentIcon-neu" />
        <span className="ihub-sentLabel neu">Neutral</span>
      </div>
      <div className="ihub-barTrack">
        <span className="ihub-barFill" style={{ width: "30%" }}></span>
      </div>
      <span className="ihub-sentPct">30%</span>
    </div>
    <div className="ihub-sentRow">
    <div className="ihub-sentLeft">
        <ThumbsDown size={13} className="ihub-sentIcon-neg" />
        <span className="ihub-sentLabel neg">Negative</span>
      </div>
      <div className="ihub-barTrack">
        <span className="ihub-barFill" style={{ width: "35%" }}></span>
      </div>
      <span className="ihub-sentPct neg">35%</span>
    </div>
  </div>

<div className="ihub-platform">
<div className="ihub-platformHead">
  <div className="ihub-platformName">Instagram</div>
  <span className="ihub-pillLite">144 mentions</span>
</div>

<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsUp size={13} className="ihub-sentIcon-pos" />
        <span className="ihub-sentLabel pos">Positive</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "35%" }}></span>
  </div>
  <span className="ihub-sentPct pos">35%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <Minus size={13} className="ihub-sentIcon-neu" />
        <span className="ihub-sentLabel neu">Neutral</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "30%" }}></span>
  </div>
  <span className="ihub-sentPct">30%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsDown size={13} className="ihub-sentIcon-neg" />
        <span className="ihub-sentLabel neg">Negative</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "35%" }}></span>
  </div>
  <span className="ihub-sentPct neg">35%</span>
</div>
</div>


<div className="ihub-platform">
<div className="ihub-platformHead">
  <div className="ihub-platformName">Reddit</div>
  <span className="ihub-pillLite">143 mentions</span>
</div>

<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsUp size={13} className="ihub-sentIcon-pos" />
        <span className="ihub-sentLabel pos">Positive</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "29%" }}></span>
  </div>
  <span className="ihub-sentPct pos">29%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <Minus size={13} className="ihub-sentIcon-neu" />
        <span className="ihub-sentLabel neu">Neutral</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "36%" }}></span>
  </div>
  <span className="ihub-sentPct">36%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsDown size={13} className="ihub-sentIcon-neg" />
        <span className="ihub-sentLabel neg">Negative</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "34%" }}></span>
  </div>
  <span className="ihub-sentPct neg">34%</span>
</div>
</div>


<div className="ihub-platform">
<div className="ihub-platformHead">
  <div className="ihub-platformName">LinkedIn</div>
  <span className="ihub-pillLite">142 mentions</span>
</div>

<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsUp size={13} className="ihub-sentIcon-pos" />
        <span className="ihub-sentLabel pos">Positive</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "36%" }}></span>
  </div>
  <span className="ihub-sentPct pos">36%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <Minus size={13} className="ihub-sentIcon-neu" />
        <span className="ihub-sentLabel neu">Neutral</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "35%" }}></span>
  </div>
  <span className="ihub-sentPct">35%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsDown size={13} className="ihub-sentIcon-neg" />
        <span className="ihub-sentLabel neg">Negative</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "30%" }}></span>
  </div>
  <span className="ihub-sentPct neg">30%</span>
</div>
</div>


<div className="ihub-platform">
<div className="ihub-platformHead">
  <div className="ihub-platformName">Facebook</div>
  <span className="ihub-pillLite">142 mentions</span>
</div>

<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsUp size={13} className="ihub-sentIcon-pos" />
        <span className="ihub-sentLabel pos">Positive</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "30%" }}></span>
  </div>
  <span className="ihub-sentPct pos">30%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <Minus size={13} className="ihub-sentIcon-neu" />
        <span className="ihub-sentLabel neu">Neutral</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "35%" }}></span>
  </div>
  <span className="ihub-sentPct">35%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsDown size={13} className="ihub-sentIcon-neg" />
        <span className="ihub-sentLabel neg">Negative</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "35%" }}></span>
  </div>
  <span className="ihub-sentPct neg">35%</span>
</div>
</div>

<div className="ihub-platform">
<div className="ihub-platformHead">
  <div className="ihub-platformName">Patient Forums</div>
  <span className="ihub-pillLite">139 mentions</span>
</div>

<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsUp size={13} className="ihub-sentIcon-pos" />
        <span className="ihub-sentLabel pos">Positive</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "36%" }}></span>
  </div>
  <span className="ihub-sentPct pos">36%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <Minus size={13} className="ihub-sentIcon-neu" />
        <span className="ihub-sentLabel neu">Neutral</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "33%" }}></span>
  </div>
  <span className="ihub-sentPct">33%</span>
</div>
<div className="ihub-sentRow">
<div className="ihub-sentLeft">
        <ThumbsDown size={13} className="ihub-sentIcon-neg" />
        <span className="ihub-sentLabel neg">Negative</span>
      </div>
  <div className="ihub-barTrack">
    <span className="ihub-barFill" style={{ width: "31%" }}></span>
  </div>
  <span className="ihub-sentPct neg">31%</span>
</div>
</div>
</div>
   ): activeTab === "Topics" ? ( <div>
     <div className="ihub-soc-platform">
     <div className="ihub-soc-platformName">Efficacy</div>
     <span className="ihub-soc-pillLite">Positive</span>
     <div className="ihub-soc-sentRow">1000 mentions • +32% growth</div>
      </div>
      <div className="ihub-soc-platform">
     <div className="ihub-soc-platformName">safety</div>
     <span className="ihub-soc-pillLite">Positive</span>
     <div className="ihub-soc-sentRow">646 mentions • +53% growth</div>
      </div>
      <div className="ihub-soc-platform">
     <div className="ihub-soc-platformName">convenience</div>
     <span className="ihub-soc-pillLite">Positive</span>
     <div className="ihub-soc-sentRow">328 mentions • +32% growth</div>
      </div>
      
<button className="ihub-soc-genBtn">
  <Sparkles size={15} className="h-1 w-1 mr-2" style={{ color: "#0f172a" }} />
  Generate Social Content
</button>

     </div>) : ( 
      <div>
        
<div className="ihub-topMentions">

<div className="ihub-tm-item">
  <span className="ihub-tm-platform">Reddit</span>
  <span className="ihub-tm-pill positive">positive</span>

  <div className="ihub-tm-quote">"Questions regarding efficacy"</div>
  <div className="ihub-tm-reach">Reach: 1,309</div>
</div>

<div className="ihub-tm-item">
  <span className="ihub-tm-platform">TikTok</span>
  <span className="ihub-tm-pill positive">positive</span>

  <div className="ihub-tm-quote">"Questions regarding efficacy"</div>
  <div className="ihub-tm-reach">Reach: 1,307</div>
</div>

<div className="ihub-tm-item">
  <span className="ihub-tm-platform">Reddit</span>
  <span className="ihub-tm-pill negative">negative</span>

  <div className="ihub-tm-quote">"Discussion about treatment options"</div>
  <div className="ihub-tm-reach">Reach: 1,301</div>
</div>

<div className="ihub-tm-item">
  <span className="ihub-tm-platform">Instagram</span>
  <span className="ihub-tm-pill positive">positive</span>

  <div className="ihub-tm-quote">"Questions regarding efficacy"</div>
  <div className="ihub-tm-reach">Reach: 1,297</div>
</div>

<div className="ihub-tm-item">
  <span className="ihub-tm-platform">Twitter/X</span>
  <span className="ihub-tm-pill positive">positive</span>

  <div className="ihub-tm-quote">"Patient experiences with side effects"</div>
  <div className="ihub-tm-reach">Reach: 1,296</div>
</div>

</div>

      </div> )}
</div>
 );
}