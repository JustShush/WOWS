<h1 align="center"> WOWS (War On Webhook Spam) </h1>

<h3 align="center"> Description </h3>

**War On Webhook Spam** is a proactive project designed to combat the exposure of sensitive webhook URLs on the open internet. Our platform scans publicly available resources, including plaintext and Base64-encoded content, to identify webhook URLs that are inadvertently exposed. Once detected, the project verifies the webhook's functionality, notifies the webhook of its exposure (including the source of the leak), and reports the discovery to our own monitoring system. To protect the exposed webhook further, we implement an auto-delete mechanism to disable or revoke it after 24 hours via a POST request, minimizing potential misuse by malicious actors.

<h3 align="center"> Roadmap </h3>

  **Scanning**
  
  Objective: Identify potential webhook URLs exposed in plaintext or Base64 encoding across public internet resources.
        
  Tasks:
            - Develop modules to crawl and parse public web pages, repositories, and files for potential webhooks.
            - Decode Base64-encoded content and inspect for webhook patterns.
            - Use pattern matching (e.g., regular expressions) to locate common webhook formats (https://hooks.slack.com, https://discord.com/api/webhooks/, etc.).


  **Testing Webhook Validity**
  
  Objective: Verify that identified webhooks are still live and functional.
  
  Tasks:
            Perform a non-intrusive HTTP request to check for a valid response without triggering any sensitive actions.
            Filter out false positives or dead webhooks.
            

  **Notification of Exposure**
  
  Objective: Alert the owner of the exposed webhook to the potential security risk.
  
  Tasks:
            Send an alert message to the webhook URL detailing the exposure.
            Include information such as:
                - The file/link/url where the webhook was discovered.
                - A recommendation to revoke and regenerate the webhook immediately.


  **Internal Monitoring**
  
  Objective: Notify the system’s own monitoring webhook of discovered webhooks and their metadata for auditing and analysis.
  
  Tasks:
            - Log each identified webhook with details (e.g., URL, file, timestamp) to an internal notification webhook for centralized monitoring.
            - Store these logs in a secure database for future reference.


  **Auto Delete Functionality**
  
  Objective: Disable exposed webhooks automatically to mitigate abuse.
  
  Tasks:
            - Send a POST request to the exposed webhook with a pre-configured payload that disables or deletes it after 24 hours.
            - Ensure the deletion process is documented and retried in case of failures.


  **Error Handling and Reporting**
  
  Objective: Manage errors gracefully and provide actionable reports.

  Tasks:
            - Implement retries for failed HTTP requests.
            - Maintain a report of webhooks that could not be notified or deleted.


  **Security and Privacy**
  
  Objective: Protect the integrity of sensitive data during processing.
  
  Tasks:
            - Ensure all communications (e.g., notifications, logs) are encrypted.
            - Limit access to stored webhook data and implement a strict data retention policy.


  **Documentation and Deployment**
  
  Objective: Provide clear guidelines for contributors and users of the project.
  
  Tasks:
            - Write comprehensive documentation covering setup, functionality, and contribution guidelines.
            - Deploy the project as a GitHub repository with CI/CD pipelines to automate builds and testing.




- made by ...
