"""Builds the multi-page site in v2/ (python3 scripts/build_v2.py).

Shared pieces (head, nav, footer, floating logo) live here once; each page's
content is below. Event cards, photos, officers and form markup are written
out in full so v2 stays independent of the single-page site at the root.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "v2"
VERSION = "2"
PAGES = [("index", "Home"), ("about", "About"), ("events", "Events"), ("officers", "Officers"), ("alumni", "Alumni"), ("join", "Join")]
CUR = ' aria-current="page"'


def head(title, description):
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="theme-color" content="#0f2233">
  <link rel="icon" type="image/png" href="favicon.png">
  <link rel="preload" href="fonts/italiana-QmWaXw.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="fonts/fonts.css?v={VERSION}">
  <link rel="stylesheet" href="css/base.css?v={VERSION}">
  <link rel="stylesheet" href="css/pages.css?v={VERSION}">
</head>
"""


def nav(cur):
    links = "\n".join(f'      <a href="{p}.html"{CUR if p == cur else ""}>{t}</a>' for p, t in PAGES)
    return f"""  <div class="progress" aria-hidden="true"></div>
  <header class="nav" data-nav>
    <a class="nav__mark" href="index.html"><img src="images/ais-logo-small.webp" alt="" width="36" height="36" data-nav-logo>AIS <em>at</em> UT Dallas</a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links" data-nav-toggle>
      <span></span><span></span><span class="sr-only">Menu</span>
    </button>
    <nav class="nav__links" id="nav-links" aria-label="Primary">
{links}
    </nav>
  </header>
"""


def footer(cur):
    links = " · ".join(f'<a href="{p}.html">{t}</a>' for p, t in PAGES)
    items = "\n".join(f'      <li><a href="{p}.html"{CUR if p == cur else ""}>{t}</a></li>' for p, t in PAGES)
    return f"""  <footer class="footer footer--v2">
    <span class="nav__mark">AIS <em>at</em> UT Dallas</span>
    <nav class="footer__links" aria-label="Footer">{links}</nav>
    <span>© <span data-year></span> AIS Student Chapter at The University of Texas at Dallas</span>
  </footer>

  <!-- Floating logo: flies from the nav to the bottom right after the landing area, then opens the page menu -->
  <div class="fab" data-fab>
    <ul class="fab__menu" id="fab-menu" aria-label="Pages">
{items}
    </ul>
    <button class="fab__button" type="button" aria-expanded="false" aria-controls="fab-menu" aria-label="Open page menu" tabindex="-1">
      <img src="images/ais-logo-small.webp" alt="" width="160" height="160">
    </button>
  </div>

  <script src="js/main.js?v={VERSION}"></script>
  <script src="js/fab.js?v={VERSION}"></script>
</body>
</html>
"""


def page_hero(eyebrow, title, sub, image="hero.jpg"):
    return f"""    <section class="page-hero" data-landing>
      <img class="page-hero__img" src="images/{image}" alt="">
      <div class="page-hero__inner">
        <p class="eyebrow">{eyebrow}</p>
        <h1 class="display"><span class="line"><span>{title}</span></span></h1>
        <p class="hero__sub">{sub}</p>
      </div>
    </section>
"""


def next_page(href, title):
    return f"""
    <a class="next-page" href="{href}"><span class="eyebrow">Next</span><span class="next-page__title">{title} <span aria-hidden="true">→</span></span></a>
"""


def cta(eyebrow, title, body, href, label, tone="jade"):
    return f"""
    <section class="cta cta--{tone}" data-reveal>
      <p class="eyebrow">{eyebrow}</p>
      <h2 class="heading">{title}</h2>
      <p class="body">{body}</p>
      <a class="button button--light" href="{href}">{label}</a>
    </section>
"""


PILLARS = """        <ul class="pillars">
          <li><strong>Professional development</strong><span>Résumé reviews, mock interviews, and career prep aimed at IS, analytics, and consulting roles.</span></li>
          <li><strong>Technical workshops</strong><span>Hands-on sessions in SQL, Python, cloud, data visualisation, and the tools employers actually use.</span></li>
          <li><strong>Industry speakers</strong><span>Talks and panels with professionals from the companies that hire UT Dallas students.</span></li>
          <li><strong>Case competitions</strong><span>Real business problems, tight deadlines, and a chance to present to judges from industry.</span></li>
          <li><strong>Social events</strong><span>Mixers, game nights, and outings that turn members into friends outside the classroom.</span></li>
        </ul>"""

MARQUEE = """    <div class="marquee" aria-hidden="true">
      <div class="marquee__track">
        <span>Technical workshops</span><span>Industry speakers</span><span>Case competitions</span><span>Career prep</span><span>Networking</span><span>Community</span>
        <span>Technical workshops</span><span>Industry speakers</span><span>Case competitions</span><span>Career prep</span><span>Networking</span><span>Community</span>
      </div>
    </div>
"""

EVENT_CARDS = """      <ol class="events__grid">
        <li>
          <a class="event" href="events.html">
            <img src="images/ocean.jpg" alt="" loading="lazy">
            <span class="event__meta">Sept 10 · Jindal School</span>
            <span class="event__title">General Meeting &amp; Welcome Social</span>
          </a>
        </li>
        <li>
          <a class="event" href="events.html">
            <img src="images/comb.jpg" alt="" loading="lazy">
            <span class="event__meta">Sept 24 · Workshop</span>
            <span class="event__title">SQL &amp; Power BI, hands-on</span>
          </a>
        </li>
        <li>
          <a class="event" href="events.html">
            <img src="images/blue-table.jpg" alt="" loading="lazy">
            <span class="event__meta">Oct 8 · Speaker series</span>
            <span class="event__title">From intern to analyst: an industry panel</span>
          </a>
        </li>
      </ol>"""

EMPLOYERS_A = ["Goldman Sachs", "JPMorgan Chase", "Microsoft", "Amazon", "Google", "Deloitte", "Accenture", "EY", "PwC", "KPMG", "Bank of America", "Capital One"]
EMPLOYERS_B = ["Texas Instruments", "IBM", "Salesforce", "Oracle", "AT&amp;T", "Charles Schwab", "Dell Technologies", "Toyota", "American Airlines", "Citi", "Wells Fargo", "Southwest Airlines"]


def ticker():
    row = lambda names: "".join(f"<li>{n}</li>" for n in names) * 2
    return f"""      <div class="ticker">
        <ul class="ticker__row">{row(EMPLOYERS_A)}</ul>
        <ul class="ticker__row ticker__row--reverse" aria-hidden="true">{row(EMPLOYERS_B)}</ul>
      </div>"""


def officer(slug, name, meta, role):
    return f'        <li><span class="avatar"><img src="images/officer-{slug}.jpg" alt="Portrait of {name}" loading="lazy"></span><strong>{name}</strong><em class="officer__meta">{meta}</em><span>{role}</span></li>'


PARTNERS = """        <ul class="partners__list">
          <li>Red Bull</li>
          <li>DoorDash</li>
        </ul>"""

COLLAGE = """    <section class="collage" aria-labelledby="collage-title">
      <p class="eyebrow" id="collage-title">Moments from the AIS community</p>
      <a class="collage__item collage__item--photo" href="https://aisnet.org/about-ais/awards/" target="_blank" rel="noopener">
        <img src="images/ais-awards.jpg" alt="A presenter speaking at an AIS-bannered podium during an awards ceremony" loading="lazy" style="object-position: 52% 40%">
        <span>Awards &amp; recognition</span>
      </a>
      <a class="collage__item collage__item--photo" href="events.html">
        <img src="images/ais-reception.jpg" alt="Conference attendees gathered at a reception in a gilded mosaic hall" loading="lazy" style="object-position: 50% 60%">
        <span>Socials &amp; receptions</span>
      </a>
      <a class="collage__item collage__item--photo" href="https://ishistory.aisnet.org/awards/30-anniversary/" target="_blank" rel="noopener">
        <img src="images/ais-celebration.jpg" alt="AIS members celebrating a colleague's 50 years in academia with a cake" loading="lazy" style="object-position: 62% 50%">
        <span>Celebrating milestones</span>
      </a>
      <a class="collage__item collage__item--photo" href="https://aisnet.org/conferences/" target="_blank" rel="noopener">
        <img src="images/ais-speaker.jpg" style="object-position: 38% 50%" alt="A speaker at a lectern introducing a keynote at the AIS PACIS conference" loading="lazy">
        <span>Speaker series</span>
      </a>
      <p class="collage__credit">Event photos: <a href="https://ishistory.aisnet.org/home/photo-gallery/" target="_blank" rel="noopener">AIS IS History photo gallery</a></p>
    </section>
"""

FEATURE = """    <section class="feature">
      <figure class="feature__photo">
        <img src="images/ais-conference.jpg" alt="A packed room of attendees listening to a session at an AIS conference" loading="lazy">
        <figcaption>
          <strong>Inside an AIS conference session</strong>
          <span>Photo: <a href="https://ishistory.aisnet.org/home/photo-gallery/" target="_blank" rel="noopener">AIS IS History photo gallery</a></span>
        </figcaption>
      </figure>
      <ul class="feature__tags" aria-label="Highlights">
        <li>Case competitions</li>
        <li>Leadership sessions</li>
        <li>Chapters nationwide</li>
      </ul>
      <div class="feature__text">
        <h2 class="heading">Compete on a <em>national</em> stage</h2>
        <p class="meta">AIS Student Chapter Leadership Conference</p>
        <p class="body">As a chapter of the global Association for Information Systems, our members can take part in the AIS Student Chapter Leadership Conference, where teams from universities across the country go head to head in case and technology competitions.</p>
        <p class="body">It’s the best way to test what you’ve learned against the strongest IS students in the country, and to come home with connections that last well beyond the weekend.</p>
        <a class="link-line link-line--dark" href="https://aisnet.org/" target="_blank" rel="noopener">About AIS national</a>
      </div>
    </section>
"""

JOIN_FORM = """    <section class="contact" id="form">
      <img class="contact__bg" src="images/stones-cream.jpg" alt="" loading="lazy">
      <div class="contact__panel">
        <div class="contact__intro">
          <h2 class="caps-display caps-display--light">Join the chapter</h2>
          <p class="contact__lede">Membership is open to every UT Dallas student, whatever your major. Want to partner with us, or just have a question? Use the same form.</p>
          <ul class="checks checks--light">
            <li>Priority access to workshops and company events</li>
            <li>Eligibility for AIS national case competitions</li>
            <li>A 10,000+ strong alumni network to learn from</li>
            <li>Résumé book shared with our industry partners</li>
            <li>A community of students heading the same way</li>
          </ul>
          <dl class="contact__details">
            <div><dt>Email</dt><dd><a href="mailto:utdallasais@gmail.com">utdallasais@gmail.com</a></dd></div>
            <div><dt>Follow</dt><dd><a href="https://www.instagram.com/utdallasais/" target="_blank" rel="noopener">Instagram</a> · <a href="https://www.linkedin.com/company/utdallasais/" target="_blank" rel="noopener">LinkedIn</a></dd></div>
            <div><dt>Find us</dt><dd>Jindal School of Management<br>800 W Campbell Rd, Richardson, TX</dd></div>
            <div><dt>Flare</dt><dd><a href="https://flare-event.app.link/EcJCg0AUW0b" target="_blank" rel="noopener">Join our Flare</a></dd></div>
          </dl>
        </div>

        <form class="form contact__form" action="https://formsubmit.co/utdallasais@gmail.com" method="POST" data-form>
          <input type="hidden" name="_subject" value="New AIS membership interest" data-subject>
          <input type="hidden" name="_template" value="table">
          <input type="hidden" name="_captcha" value="false">
          <input class="honeypot" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
          <fieldset class="choice">
            <legend>I’m interested in</legend>
            <label><input type="radio" name="topic" value="Joining AIS" data-subject-value="New AIS membership interest" checked><span>Joining AIS</span></label>
            <label><input type="radio" name="topic" value="Partnering or sponsoring" data-subject-value="New AIS partnership inquiry"><span>Partnering</span></label>
            <label><input type="radio" name="topic" value="Something else" data-subject-value="New message from the AIS website"><span>Something else</span></label>
          </fieldset>
          <label class="field"><span>Name</span><input type="text" name="name" required autocomplete="name"></label>
          <label class="field"><span>Email</span><input type="email" name="email" required autocomplete="email" placeholder="netid@utdallas.edu"></label>
          <label class="field"><span>Message <em class="field__opt">(optional)</em></span><textarea name="message" rows="3"></textarea></label>
          <label class="optin">
            <input type="checkbox" name="Email list" value="Yes, add me to the event email list">
            <span>Add me to the email list for event notifications</span>
          </label>
          <button class="button button--light" type="submit">Send</button>
          <p class="form__note" role="status" aria-live="polite"></p>
        </form>
      </div>
    </section>
"""


def faq(items):
    rows = "\n".join(f"""        <details>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>""" for q, a in items)
    return f"""
    <section class="faq">
      <div class="faq__head">
        <p class="eyebrow">Questions</p>
        <h2 class="heading">Frequently <em>asked</em></h2>
      </div>
      <div class="faq__list">
{rows}
      </div>
    </section>
"""


ABOUT_FAQ = faq([
    ("Who can join AIS?", "Any UT Dallas student. You don’t need to be an information systems major; members come from business, computer science, data science, finance and more."),
    ("How do I become a member?", 'Fill in the form on the <a href="join.html">Join page</a> and choose “Joining AIS”. An officer will follow up with next steps.'),
    ("What happens at a typical meeting?", "General meetings mix chapter updates with a workshop, speaker or social, so there’s always something to learn and people to meet."),
    ("Can my company work with the chapter?", 'Yes. We host speakers, workshops and recruiting events with industry partners. Choose “Partnering” on the <a href="join.html?topic=partner">Join form</a> and we’ll be in touch.'),
    ("How do I hear about upcoming events?", "Tick “Add me to the email list” on the Join form, follow us on Instagram and LinkedIn, or join our Flare."),
])

# ---------------------------------------------------------------- pages
PAGES_CONTENT = {}

PAGES_CONTENT["index"] = ("AIS at UT Dallas", "The UT Dallas student chapter of the Association for Information Systems.", f"""    <section class="hero" data-landing>
      <img class="hero__img" src="images/hero.jpg" alt="Stones, a shell and a jade roller resting on deep blue handmade paper">
      <div class="hero__inner">
        <p class="eyebrow">Student Chapter · Naveen Jindal School of Management</p>
        <h1 class="display">
          <span class="line"><span>Association for</span></span>
          <em class="line"><span>Information Systems</span></em>
        </h1>
        <p class="hero__sub">Where UT Dallas students learn the tools, meet the people, and build the experience behind a career in technology.</p>
        <div class="hero__actions">
          <a class="link-line" href="join.html">Become a member</a>
          <a class="link-line" href="events.html">See upcoming events</a>
        </div>
      </div>
    </section>

    <section class="stats" data-reveal>
      <div><strong><span data-count="10000">10,000</span>+</strong><span>Alumni in the AIS network</span></div>
      <div><strong>Global</strong><span>Part of the Association for Information Systems</span></div>
      <div><strong>All majors</strong><span>Open to every UT Dallas student</span></div>
      <div><strong>JSOM</strong><span>Home at the Naveen Jindal School of Management</span></div>
    </section>

    <section class="split">
      <div class="panel panel--ink" data-reveal>
        <h2 class="heading">Welcome to <em>AIS</em></h2>
        <p class="lede">We promote the study and practice of information systems through professional development, technical workshops, and a community of students who like figuring out how technology and business fit together.</p>
        <figure class="frame">
          <img src="images/stone-stack.jpg" alt="Three smooth stones balanced on a block of banded jasper" loading="lazy">
        </figure>
        <a class="link-line" href="about.html">More about us</a>
      </div>
      <div class="panel panel--seaglass">
        <h2 class="heading">What we <em>do</em></h2>
        <p class="caps-display caps-display--small">Learn. Connect. Build. Compete.</p>
{PILLARS}
      </div>
    </section>

{MARQUEE}
    <section class="explore">
      <div class="explore__head">
        <p class="eyebrow">Explore</p>
        <h2 class="heading">Find your <em>way in</em></h2>
      </div>
      <div class="explore__grid" data-reveal>
        <a class="explore__card" href="events.html"><img src="images/ais-speaker.jpg" alt="" loading="lazy"><span class="explore__label">Events</span><span class="explore__text">Workshops, speakers, competitions and socials.</span></a>
        <a class="explore__card" href="officers.html"><img src="images/officer-chinmayi.jpg" alt="" loading="lazy"><span class="explore__label">Officers</span><span class="explore__text">Meet the students who run the chapter.</span></a>
        <a class="explore__card" href="alumni.html"><img src="images/ais-reception.jpg" alt="" loading="lazy"><span class="explore__label">Alumni</span><span class="explore__text">Where AIS members go next.</span></a>
        <a class="explore__card" href="join.html"><img src="images/stones-cream.jpg" alt="" loading="lazy"><span class="explore__label">Join</span><span class="explore__text">Become a member in a minute.</span></a>
      </div>
    </section>

    <section class="events upnext" data-calendar>
      <div class="events__head">
        <h2 class="heading"><em>Coming</em> up</h2>
        <a class="link-line" href="events.html">All events</a>
      </div>
{EVENT_CARDS}
    </section>

    <section class="partners partners--band" data-reveal>
      <p class="eyebrow partners__label">Current partners</p>
{PARTNERS}
    </section>
{cta("Membership", "Ready to <em>join</em>?", "Membership is open to every UT Dallas student, whatever your major.", "join.html", "Become a member")}""")

PAGES_CONTENT["about"] = ("About · AIS at UT Dallas", "Who we are and what the AIS chapter at UT Dallas does.", page_hero("Who we are", "About <em>AIS</em>", "A student chapter of the global Association for Information Systems, based at the Jindal School.", "stone-stack.jpg") + f"""
    <section class="split">
      <div class="panel panel--ink" data-reveal>
        <p class="eyebrow">Our mission</p>
        <h2 class="heading">Technology meets <em>business</em></h2>
        <p class="lede">We promote the study and practice of information systems through professional development, technical workshops, and a community of students who like figuring out how technology and business fit together.</p>
        <p class="lede">Whether you’re aiming for analytics, consulting, product or engineering, AIS is where you practise the skills, meet the people, and find your footing.</p>
        <dl class="facts">
          <div><dt>Part of</dt><dd>Global AIS</dd></div>
          <div><dt>Alumni</dt><dd>10,000+</dd></div>
          <div><dt>Open to</dt><dd>All majors</dd></div>
        </dl>
      </div>
      <div class="panel panel--seaglass">
        <h2 class="heading">What we <em>do</em></h2>
        <p class="caps-display caps-display--small">Learn. Connect. Build. Compete.</p>
{PILLARS}
      </div>
    </section>

{MARQUEE}
{FEATURE}
{ABOUT_FAQ}{next_page("events.html", "Upcoming events")}""")

PAGES_CONTENT["events"] = ("Events · AIS at UT Dallas", "Upcoming AIS at UT Dallas events.", page_hero("Workshops · Speakers · Competitions", "Chapter <em>Events</em>", "What’s coming up at the chapter, and moments from the wider AIS community.", "ais-speaker.jpg") + f"""
    <!-- Filled from the chapter's Google Calendar once CALENDAR is set in js/main.js -->
    <section class="events" id="events" data-calendar>
      <div class="events__head">
        <h2 class="heading"><em>Upcoming</em> Events</h2>
        <a class="link-line" href="events.html" data-calendar-link target="_blank" rel="noopener">Full calendar</a>
      </div>
{EVENT_CARDS}
    </section>

    <section class="types">
      <div class="types__head">
        <p class="eyebrow">What to expect</p>
        <h2 class="heading">Four ways to <em>show up</em></h2>
      </div>
      <ol class="types__grid" data-reveal>
        <li><span class="types__num">01</span><strong>Technical workshops</strong><p>Hands-on sessions in SQL, Python, cloud and data visualisation. Bring a laptop.</p></li>
        <li><span class="types__num">02</span><strong>Industry speakers</strong><p>Professionals share how they got where they are, and what they look for in candidates.</p></li>
        <li><span class="types__num">03</span><strong>Case competitions</strong><p>Team up, solve a real business problem, and present to judges from industry.</p></li>
        <li><span class="types__num">04</span><strong>Socials</strong><p>Mixers, game nights and outings. The easiest way to meet the rest of the chapter.</p></li>
      </ol>
    </section>

{FEATURE}
{COLLAGE}{cta("Stay in the loop", "Never miss an <em>event</em>", "Join the email list and we’ll let you know when something’s coming up.", "join.html", "Join the email list", "ocean")}{next_page("officers.html", "Meet the officers")}""")

PAGES_CONTENT["officers"] = ("Officers · AIS at UT Dallas", "Meet the AIS at UT Dallas officers.", page_hero("The team", "Meet the <em>Officers</em>", "The students who plan every workshop, speaker, and social.", "ais-reception.jpg") + f"""
    <section class="officers">
      <div class="officers__group">
        <p class="eyebrow">Executive board</p>
        <ul class="officers__grid">
{officer("chinmayi", "Chinmayi Maddali", "Business Analytics and AI, Junior", "President")}
{officer("avi", "Avi Pandya", "Finance and CIS Tech, Junior", "Vice President")}
{officer("myiesha", "Myiesha Panjwani", "Finance, Junior", "VP of Operations")}
{officer("aaron", "Aaron Sen", "Finance, Junior", "Treasurer")}
        </ul>
      </div>
      <div class="officers__group">
        <p class="eyebrow">Technology &amp; marketing</p>
        <ul class="officers__grid">
{officer("nirmal", "Nirmal Shah", "Computer Science, Junior", "Tech Dev Officer")}
{officer("sanika", "Sanika Tripathi", "Data Science, Junior", "Head of Marketing")}
        </ul>
      </div>
    </section>
{cta("Get involved", "Want to help <em>lead</em>?", "We’re always looking for members who want to plan events, build tools, or grow the chapter. Send us a note and tell us what you’re interested in.", "join.html", "Get in touch")}{next_page("alumni.html", "Our alumni network")}""")

PAGES_CONTENT["alumni"] = ("Alumni · AIS at UT Dallas", "The AIS alumni network and chapter partners.", page_hero("10,000+ strong", "Alumni &amp; <em>Partners</em>", "Where AIS members go next, and the companies that support the chapter.", "ais-celebration.jpg") + f"""
    <section class="alumni" aria-labelledby="alumni-title">
      <div class="alumni__head">
        <p class="alumni__stat"><span class="alumni__ghost" aria-hidden="true">10,000+</span><span class="alumni__live"><span data-count="10000">10,000</span>+</span></p>
        <div>
          <h2 class="heading" id="alumni-title">An alumni network that <em>opens doors</em></h2>
          <p class="body">AIS members go on to build careers at the world’s leading banks, tech companies, and consultancies, and many come back to mentor, speak, and recruit the next class.</p>
        </div>
      </div>
      <p class="eyebrow alumni__label">Where AIS alumni work</p>
{ticker()}
    </section>

    <section class="why">
      <div class="why__intro" data-reveal>
        <p class="eyebrow">For companies</p>
        <h2 class="heading">Partner with <em>the chapter</em></h2>
        <p class="body">Reach motivated students in information systems, analytics and technology before they hit the job market.</p>
        <div class="partners partners--inline">
          <p class="eyebrow partners__label">Current partners</p>
{PARTNERS}
        </div>
      </div>
      <ul class="pillars why__list">
        <li><strong>Recruit early</strong><span>Meet members at workshops and info sessions, and get access to our résumé book.</span></li>
        <li><strong>Host a workshop</strong><span>Teach the tools your teams use every day, and see who’s keen to learn them.</span></li>
        <li><strong>Sponsor an event</strong><span>Put your brand in front of the chapter at socials, competitions and speaker nights.</span></li>
      </ul>
    </section>
{cta("Partnerships", "Let’s <em>work together</em>", "Tell us a little about your team and we’ll follow up with ways to get involved.", "join.html?topic=partner#form", "Partner with us")}{next_page("join.html", "Join the chapter")}""")

PAGES_CONTENT["join"] = ("Join · AIS at UT Dallas", "Join AIS at UT Dallas, partner with the chapter, or get in touch.", page_hero("Open to every major", "Get <em>Involved</em>", "Become a member, partner with us, or just say hello.", "stones-cream.jpg") + f"""
    <section class="steps">
      <ol class="steps__grid" data-reveal>
        <li><span class="types__num">01</span><strong>Send the form</strong><p>Tell us your name and UTD email below. It takes under a minute.</p></li>
        <li><span class="types__num">02</span><strong>Hear from an officer</strong><p>We’ll reach out with next steps and the next general meeting.</p></li>
        <li><span class="types__num">03</span><strong>Show up</strong><p>Come to a meeting, workshop or social and meet the chapter.</p></li>
      </ol>
    </section>

{JOIN_FORM}{next_page("index.html", "Back to home")}""")


def build():
    for slug, _ in PAGES:
        title, description, body = PAGES_CONTENT[slug]
        html = head(title, description) + f'<body class="v2 page-{slug}">\n\n' + nav(slug) + "\n  <main>\n\n" + body + "\n  </main>\n\n" + footer(slug)
        (OUT / f"{slug}.html").write_text(html)
    print("built", ", ".join(f"{s}.html" for s, _ in PAGES))


if __name__ == "__main__":
    build()
