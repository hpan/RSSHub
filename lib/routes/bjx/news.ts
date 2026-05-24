import { load } from 'cheerio';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';

export const route: Route = {
    path: '/news',
    categories: ['new-media'],
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

async function getArticleContent(url: string): Promise<string | null> {
    const html = await ofetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    });

    const $ = load(html);

    // 移除无关元素
    $('script, style, nav, footer, header, aside, .advertisement, .ad, .sidebar, .comment, .share, .related').remove();

    // 尝试多个选择器获取文章正文
    const contentSelectors = [
        '.article-content',
        '.article-body',
        '.content-body',
        '#articleContent',
        '.news-content',
        'article',
        '.main-content',
    ];

    let content = '';
    for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
            content = element.html() || '';
            if (content.length > 100) {
                break;
            }
        }
    }

    return content || null;
}

async function handler() {
    const listHtml = await ofetch('https://www.bjx.com.cn');

    const $ = load(listHtml);
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

    // 获取每个文章的详细内容
    const itemsWithContent = await Promise.all(
        items.slice(0, 10).map(async (item) => {
            const content = await getArticleContent(item.link);
            return {
                title: item.title,
                link: item.link,
                description: content || item.title,
            };
        })
    );

    return {
        title: '北极星电力网 - 新闻中心',
        link: 'https://www.bjx.com.cn/',
        item: itemsWithContent,
    };
}