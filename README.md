<h1>WOWS (War On Webhook Spam)</h1>

<h3 align="center"> Description </h3>

**War On Webhook Spam** is a proactive project designed to combat the exposure of sensitive webhook URLs on the open internet. Our platform scans publicly available resources, including plaintext and Base64-encoded content, to identify webhook URLs that are inadvertently exposed. Once detected, the project verifies the webhook's functionality, notifies the webhook of its exposure (including the source of the leak), and reports the discovery to our own monitoring system. To protect the exposed webhook further, we implement an auto-delete mechanism to disable or revoke it after 24 hours via a POST request, minimizing potential misuse by malicious actors.
this project is a safeguarding act created to protect leaked discord webhooks, in recent events there has been many webhooks being spammed with random racist/homophobic and confusing messages leading to other random servers that don't seem to be related to it in any way.

<h3 align="center"> Roadmap </h3>

  <h3 align="left">Scanning</h3>
<p><strong>Objective:</strong> Identify potential webhook URLs exposed in plaintext or Base64 encoding across public internet resources.</p>
<ul>
  <li>Develop modules to crawl and parse public web pages, repositories, and files for potential webhooks.</li>
  <li>Decode Base64-encoded content and inspect for webhook patterns.</li>
  <li>Use pattern matching (e.g., regular expressions) to locate common webhook formats (e.g., <code>https://discord.com/api/webhooks/</code>, <code>https://discordapp.com/api/webhooks/</code>).</li>
</ul>

<h3 align="left">Testing Webhook Validity</h3>
<p><strong>Objective:</strong> Verify that identified webhooks are still live and functional.</p>
<ul>
  <li>Perform a non-intrusive HTTP request to check for a valid response without triggering any sensitive actions.</li>
  <li>Filter out false positives or dead webhooks.</li>
</ul>

<h3 align="left">Notification of Exposure</h3>
<p><strong>Objective:</strong> Alert the owner of the exposed webhook to the potential security risk.</p>
<ul>
  <li>Send an alert message to the webhook URL detailing the exposure.</li>
  <li>Include information such as:
    <ul>
      <li>The file/link/URL where the webhook was discovered.</li>
      <li>A recommendation to revoke and regenerate the webhook immediately.</li>
    </ul>
  </li>
</ul>

<h3 align="left">Internal Monitoring</h3>
<p><strong>Objective:</strong> Notify the system’s own monitoring webhook of discovered webhooks and their metadata for auditing and analysis.</p>
<ul>
  <li>Log each identified webhook with details (e.g., URL, file, timestamp) to an internal notification webhook for centralized monitoring.</li>
  <li>Store these logs in a secure database for future reference.</li>
</ul>

<h3 align="left">Auto Delete Functionality</h3>
<p><strong>Objective:</strong> Disable exposed webhooks automatically to mitigate abuse.</p>
<ul>
  <li>Send a POST request to the exposed webhook with a pre-configured payload that disables or deletes it after 24 hours.</li>
  <li>Ensure the deletion process is documented and retried in case of failures.</li>
</ul>



  <h3 align="left">Error Handling and Reporting</h3>
<p><strong>Objective:</strong> Manage errors gracefully and provide actionable reports.</p>
<ul>
  <li>Implement retries for failed HTTP requests.</li>
  <li>Maintain a report of webhooks that could not be notified or deleted.</li>
</ul>

<h3 align="left">Security and Privacy</h3>
<p><strong>Objective:</strong> Protect the integrity of sensitive data during processing.</p>
<ul>
  <li>Ensure all communications (e.g., notifications, logs) are encrypted.</li>
  <li>Limit access to stored webhook data and implement a strict data retention policy.</li>
</ul>

<h3 align="left">Documentation and Deployment</h3>
<p><strong>Objective:</strong> Provide clear guidelines for contributors and users of the project.</p>
<ul>
  <li>Write comprehensive documentation covering setup, functionality, and contribution guidelines.</li>
  <li>Deploy the project as a GitHub repository with CI/CD pipelines to automate builds and testing.</li>
</ul>


<h3 align="left">our links</h3>
<ul>
  <li>Discord bot <a href="https://discord.com/oauth2/authorize?client_id=747412110782234654&permissions=8&scope=bot%20applications.commands">here</a></li>
  <li>Support server <a href="https://discord.gg/QT6BVnWnKu">here</a></li>
</ul>

<h3 align="left">Important Tips</h3>
<p>To protect your Discord webhooks in the future, we suggest you:</p>
<ul>
  <li>
    Don't share your screen when working with webhooks in case you accidentally leak it, unless you are sharing your screen with a trusted person.
  </li>
  <li>
    Don't post your webhook online. (We have no idea why you would do this anyways, but you can never be too sure with some people...)
  </li>
  <li>
    Beware of tools you create/publicize. (Even if you have coded a tool you are proud of and want to share it with other people, if you have a webhook in that tool, it can be extracted and used maliciously.)
  </li>
</ul>


<h3 align="left">Credits to the hard working people behind this project</h3>
<ul>
  <li><a href="https://github.com/JustShush">JustShush</a></li>
  <li><a href="https://github.com/M1ONTOP">M1ONTOP</a></li>
  <li><a href="https://github.com/ArcticHonour">ArcticHonour</a></li>
  <li><a href="https://github.com/beigeworm">beigeworm</a></li>
  <li><a href="https://github.com/PixelMelt">pixelmelt</a></li>
</ul>
