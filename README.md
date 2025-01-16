# Freelance scraper

A simple scraper for Freelancermap that will send you mails in regular intervals

## Instructions

0. Make sure deno 2 is installed on your machine.
1. Create a `.env` file with the credentials for your email server.
2. Create a `config.yaml` to configure scraping (e.g. target email address, scraping interval, keywords to search for etc.) .
3. Start with `deno task start`.

## Considerations for future optimisation

- SMTP handling in deno 2 is a mess. Right now this uses `nodemailer`, which is suboptimal because it needs so many permissions
- Error handlling could be much better


