import { load } from 'cheerio';
import type { Route } from '@/types';
import got from '@/utils/got';

export const route: Route = {
    path: '/news',
    categories: ['news'],
    example: '/bjx/news',
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
            source: ['www.bjx.com.cn/'],
            target: '/news',
        },
    ],
};

async function handler(ctx) {
    const response = await got({
        method: 'get',
        url: 'https://www.bjx.com.cn',
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
        if (link.startsWith('//')) {
            fullLink = `https:${link}`;
        } else if (link.startsWith('/')) {
            fullLink = `https://www.bjx.com.cn${link}`;
        } else if (!link.startsWith('http')) {
            return;
        }

        if (!fullLink.includes('bjx.com.cn')) {
            return;
        }

        items.push({
            title,
            link: fullLink,
        });
    });

    return {
        title: '北极星电力网 - 新闻中心',
        link: 'https://www.bjx.com.cn/',
        item: items.slice(0, 20),
    };
}
