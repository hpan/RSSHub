import { load } from 'cheerio';
import type { Route } from '@/types';
import { getPlaywrightPage } from '@/utils/playwright';

export const route: Route = {
    path: '/news',
    categories: ['new-media'],
    example: '/bjx/news',
    features: {
        requireConfig: false,
        requirePuppeteer: true,
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

async function handler() {
    let html: string;
    
    try {
        // 使用Playwright访问首页获取新闻列表
        const { page, destroy } = await getPlaywrightPage('https://www.bjx.com.cn', {
            gotoConfig: {
                waitUntil: 'networkidle',
                timeout: 30000,
            },
        });

        html = await page.content();
        await destroy();
    } catch {
        return {
            title: '北极星电力网 - 新闻中心',
            link: 'https://www.bjx.com.cn/',
            item: [],
            description: '无法访问北极星电力网，请在中国大陆地区访问或检查网络连接。',
        };
    }

    const $ = load(html);
    const items: { title: string; link: string }[] = [];

    // 从首页新闻区域提取新闻链接
    $('a').each((_, element) => {
        const link = $(element).attr('href');
        if (!link) {
            return;
        }

        const title = $(element).text().trim();
        if (!title || title.length < 10) {
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

        // 只保留新闻详情页链接
        if (!fullLink.includes('bjx.com.cn') || !fullLink.includes('/html/') || !fullLink.match(/\d+\.shtml$/)) {
            return;
        }

        // 避免重复链接
        if (items.some((i) => i.link === fullLink)) {
            return;
        }

        items.push({
            title,
            link: fullLink,
        });
    });

    // 返回新闻列表（由于验证码限制，暂时只返回标题和链接）
    return {
        title: '北极星电力网 - 新闻中心',
        link: 'https://www.bjx.com.cn/',
        item: items.slice(0, 20),
    };
}
