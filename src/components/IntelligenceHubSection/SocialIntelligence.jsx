// Author: Abhirup Nandi — 2026-05-20
// Summary: Added Topics + Top Mentions tab switching with state machine; replaced header dot with Share2 lucide icon; added topic / mention datasets.

 import React, { useState } from "react";
  import "./IntelligenceCss/IntelligenceDashboard.css";
  import "./IntelligenceCss/SocialIntelligence.css";
  import { Share2, MessageCircle, ThumbsUp, TrendingUp, Sparkles } from "lucide-react";

  export default function WebsiteIntelligence() {
   const [activeTab, setActiveTab] = useState("platforms"); // "platforms" | "topics" | "mentions"

   const topics = [
     { name: "Efficacy",     mentions: 1000, growth: "+21%", sentiment: "Positive" },
     { name: "Safety",       mentions: 646,  growth: "+13%", sentiment: "Positive" },
     { name: "Convenience",  mentions: 328,  growth: "+55%", sentiment: "Positive" },
   ];

   const topMentions = [
     { platform: "Reddit",   quote: "Questions regarding efficacy",     reach: 1309, sentiment: "positive" },
     { platform: "TikTok",   quote: "Questions regarding efficacy",     reach: 1307, sentiment: "positive" },
     { platform: "Reddit",   quote: "Discussion about treatment options", reach: 1301, sentiment: "negative" },
     { platform: "Instagram",quote: "Questions regarding efficacy",     reach: 1297, sentiment: "positive" },
     { platform: "Twitter/X",quote: "Patient experiences with side effects", reach: 1296, sentiment: "positive" },
   ];

   return (
 <div className="ihub-card ihub-intelCard ihub-social-card">
    <div className="ihub-intelHead">
      <div className="ihub-intelTitle">
        <Share2 className="ihub-header-icon social-purple" strokeWidth={2} />
        <div>
          <div className="ihub-intelName">Social Intelligence</div>
          <div className="ihub-intelSubtitle">Social listening insights for all audiences</div>
        </div>
      </div>
    </div>

    {/* mini stats */}
    <div className="ihub-miniRow">
      <div className="ihub-mini violet">
        <MessageCircle className="ihub-miniIcon" strokeWidth={2} />
        <div className="ihub-miniValue">1,000</div>
        <div className="ihub-miniLabel">Total Mentions</div>
      </div>
      <div className="ihub-mini green">
        <ThumbsUp className="ihub-miniIcon" strokeWidth={2} />
        <div className="ihub-miniValue">34%</div>
        <div className="ihub-miniLabel">Positive Sentiment</div>
      </div>
      <div className="ihub-mini blue">
        <TrendingUp className="ihub-miniIcon" strokeWidth={2} />
        <div className="ihub-miniValue">3</div>
        <div className="ihub-miniLabel">Trending Topics</div>
      </div>
      <div className="ihub-mini orange">
        <Share2 className="ihub-miniIcon" strokeWidth={2} />
        <div className="ihub-miniValue">7</div>
        <div className="ihub-miniLabel">Platforms</div>
      </div>
    </div>

    {/* tabs */}
    <div className="ihub-tabs">
      <button
        className={`ihub-tab ${activeTab === "platforms" ? "active" : ""}`}
        onClick={() => setActiveTab("platforms")}
      >
        Platforms
      </button>
      <button
        className={`ihub-tab ${activeTab === "topics" ? "active" : ""}`}
        onClick={() => setActiveTab("topics")}
      >
        Topics
      </button>
      <button
        className={`ihub-tab ${activeTab === "mentions" ? "active" : ""}`}
        onClick={() => setActiveTab("mentions")}
      >
        Top Mentions
      </button>
    </div>

    {/* ───── Platforms tab ───── */}
    {activeTab === "platforms" && (
      <>
    {/* Platform list */}
    <div className="ihub-platform">
      <div className="ihub-platformHead">
        <div className="ihub-platformName">Twitter/X</div>
        <span className="ihub-pillLite">146 mentions</span>
      </div>

      <div className="ihub-sentRow">
        <span className="ihub-sentLabel pos">Positive</span>
        <div className="ihub-barTrack">
          <span className="ihub-barFill pos" style={{ width: "34%" }}></span>
        </div>
        <span className="ihub-sentPct">34%</span>
      </div>
      <div className="ihub-sentRow">
        <span className="ihub-sentLabel neu">Neutral</span>
        <div className="ihub-barTrack">
          <span className="ihub-barFill neu" style={{ width: "36%" }}></span>
        </div>
        <span className="ihub-sentPct">36%</span>
      </div>
      <div className="ihub-sentRow">
        <span className="ihub-sentLabel neg">Negative</span>
        <div className="ihub-barTrack">
          <span className="ihub-barFill neg" style={{ width: "30%" }}></span>
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
        <span className="ihub-sentLabel pos">Positive</span>
        <div className="ihub-barTrack">
          <span className="ihub-barFill pos" style={{ width: "35%" }}></span>
        </div>
        <span className="ihub-sentPct">35%</span>
      </div>
      <div className="ihub-sentRow">
        <span className="ihub-sentLabel neu">Neutral</span>
        <div className="ihub-barTrack">
          <span className="ihub-barFill neu" style={{ width: "30%" }}></span>
        </div>
        <span className="ihub-sentPct">30%</span>
      </div>
      <div className="ihub-sentRow">
        <span className="ihub-sentLabel neg">Negative</span>
        <div className="ihub-barTrack">
          <span className="ihub-barFill neg" style={{ width: "35%" }}></span>
        </div>
        <span className="ihub-sentPct neg">35%</span>
      </div>
    </div>
    {/* Instagram */}
<div className="ihub-platform">
  <div className="ihub-platformHead">
    <div className="ihub-platformName">Instagram</div>
    <span className="ihub-pillLite">144 mentions</span>
  </div>

  <div className="ihub-sentRow">
    <span className="ihub-sentLabel pos">Positive</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill pos" style={{ width: "35%" }}></span>
    </div>
    <span className="ihub-sentPct">35%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neu">Neutral</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neu" style={{ width: "30%" }}></span>
    </div>
    <span className="ihub-sentPct">30%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neg">Negative</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neg" style={{ width: "35%" }}></span>
    </div>
    <span className="ihub-sentPct neg">35%</span>
  </div>
</div>

{/* Reddit */}
<div className="ihub-platform">
  <div className="ihub-platformHead">
    <div className="ihub-platformName">Reddit</div>
    <span className="ihub-pillLite">143 mentions</span>
  </div>

  <div className="ihub-sentRow">
    <span className="ihub-sentLabel pos">Positive</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill pos" style={{ width: "29%" }}></span>
    </div>
    <span className="ihub-sentPct">29%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neu">Neutral</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neu" style={{ width: "36%" }}></span>
    </div>
    <span className="ihub-sentPct">36%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neg">Negative</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neg" style={{ width: "34%" }}></span>
    </div>
    <span className="ihub-sentPct neg">34%</span>
  </div>
</div>

{/* LinkedIn */}
<div className="ihub-platform">
  <div className="ihub-platformHead">
    <div className="ihub-platformName">LinkedIn</div>
    <span className="ihub-pillLite">142 mentions</span>
  </div>

  <div className="ihub-sentRow">
    <span className="ihub-sentLabel pos">Positive</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill pos" style={{ width: "36%" }}></span>
    </div>
    <span className="ihub-sentPct">36%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neu">Neutral</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neu" style={{ width: "35%" }}></span>
    </div>
    <span className="ihub-sentPct">35%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neg">Negative</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neg" style={{ width: "30%" }}></span>
    </div>
    <span className="ihub-sentPct neg">30%</span>
  </div>
</div>

{/* Facebook */}
<div className="ihub-platform">
  <div className="ihub-platformHead">
    <div className="ihub-platformName">Facebook</div>
    <span className="ihub-pillLite">142 mentions</span>
  </div>

  <div className="ihub-sentRow">
    <span className="ihub-sentLabel pos">Positive</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill pos" style={{ width: "30%" }}></span>
    </div>
    <span className="ihub-sentPct">30%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neu">Neutral</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neu" style={{ width: "35%" }}></span>
    </div>
    <span className="ihub-sentPct">35%</span>
  </div>
  <div className="ihub-sentRow">
    <span className="ihub-sentLabel neg">Negative</span>
    <div className="ihub-barTrack">
      <span className="ihub-barFill neg" style={{ width: "35%" }}></span>
    </div>
    <span className="ihub-sentPct neg">35%</span>
  </div>
</div>
      </>
    )}

    {/* ───── Topics tab ───── */}
    {activeTab === "topics" && (
      <>
        <div className="ihub-topicList">
          {topics.map((t, idx) => (
            <div className="ihub-topicRow" key={idx}>
              <div className="ihub-topicMain">
                <div className="ihub-topicName">{t.name}</div>
                <div className="ihub-topicSub">
                  {t.mentions} mentions • {t.growth} growth
                </div>
              </div>
              <span className="ihub-topicPill positive">
                <span className="ihub-topicEmoji" role="img" aria-label="positive">😄</span>
                {t.sentiment}
              </span>
            </div>
          ))}
        </div>

        <button className="ihub-genSocialBtn">
          <Sparkles className="ihub-genSocialIcon" strokeWidth={2} />
          <span>Generate Social Content</span>
        </button>
      </>
    )}

    {/* ───── Top Mentions tab ───── */}
    {activeTab === "mentions" && (
      <div className="ihub-mentionList">
        {topMentions.map((m, idx) => (
          <div className="ihub-mentionRow" key={idx}>
            <div className="ihub-mentionMain">
              <span className="ihub-mentionPlatform">{m.platform}</span>
              <div className="ihub-mentionQuote">&ldquo;{m.quote}&rdquo;</div>
              <div className="ihub-mentionReach">Reach: {m.reach.toLocaleString()}</div>
            </div>
            <span className={`ihub-mentionSentiment ${m.sentiment}`}>
              {m.sentiment}
            </span>
          </div>
        ))}
      </div>
    )}
</div>
   );
}