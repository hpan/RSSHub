import { load } from 'cheerio';
import type { Route } from '@/types';
import got from '@/utils/got';

export const route: Route = {
    path: '/news',
    categories: ['news'],
    example: '/cec/news',
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '新闻中心',
    maintainers: ['DIYgod'],
    handler,
    radar: [
        {
            source: ['www.cec.org.cn/'],
            target: '/news',
        },
    ],
};

async function handler(ctx) {
    const response = await got({
        method: 'get',
        url: 'https://www.cec.org.cn',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    });

    const $ = load(response.data);

    const items = [];

    $('a').each((_, element) => {
        const link = $(element).attr('href');
        if (!link) {
            return;
        }

        let title = $(element).text().trim();
        if (!title || title.length < 5) {
            return;
        }

        let fullLink = link;
        if (link.startsWith('./')) {
            fullLink = `https://www.cec.org.cn${link.substring(1)}`;
        } else if (link.startsWith('/')) {
            fullLink = `https://www.cec.org.cn${link}`;
        } else if (!link.startsWith('http')) {
            return;
        }

        if (!fullLink.includes('cec.org.cn')) {
            return;
        }

        if (!fullLink.includes('detail/index.html')) {
            return;
        }

        items.push({
            title,
            link: fullLink,
        });
    });

    return {
        title: '中国电力企业联合会 - 新闻中心',
        link: 'https://www.cec.org.cn/',
        item: items.slice(0, 20),
    };
}
