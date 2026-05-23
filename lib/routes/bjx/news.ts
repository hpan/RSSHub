import { load } from 'cheerio';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import { parseDate } from '@/utils/parse-date';
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
    // 使用Playwright访问首页获取新闻列表
    const { page, destroy } = await getPlaywrightPage('https://www.bjx.com.cn', {
        gotoConfig: {
            waitUntil: 'networkidle',
            timeout: 30000,
        },
    });

    const html = await page.content();
    await destroy();

    const $ = load(html);
    const items: { title: string; link: string; pubDate?: string; description?: string }[] = [];

    // 从首页提取新闻链接
    $('a').each((_, element) => {
        const link = $(element).attr('href');
        if (!link) {
            return;
        }

        const title = $(element).text().trim();
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

        // 只保留新闻详情页链接
        if (!fullLink.includes('bjx.com.cn') || !fullLink.includes('html')) {
            return;
        }

        items.push({
            title,
            link: fullLink,
        });
    });

    // 使用Playwright获取每篇文章的详情
    const articleItems = await Promise.all(
        items.slice(0, 20).map((item) =>
            cache.tryGet(item.link, async () => {
                try {
                    const { page: articlePage, destroy: destroyArticleBrowser } = await getPlaywrightPage(item.link, {
                        gotoConfig: {
                            waitUntil: 'networkidle',
                            timeout: 30000,
                        },
                    });

                    const articleHtml = await articlePage.content();
                    await destroyArticleBrowser();

                    const $article = load(articleHtml);

                    // 提取文章标题
                    const articleTitle = $article('h1').text().trim() || item.title;

                    // 提取发布日期
                    const pubDateText = $article('.time, .article-time, .pubtime, .publish-time, [class*="time"], [class*="date"]').first().text().trim();
                    const pubDate = pubDateText ? parseDate(pubDateText, 'YYYY-MM-DD HH:mm:ss') : undefined;

                    // 提取文章内容
                    const description = $article('.article-content, .content, #content, .article-body, [class*="content"]').first().html() || '';

                    return {
                        title: articleTitle,
                        link: item.link,
                        pubDate,
                        description,
                    };
                } catch {
                    // 如果获取详情失败，返回基本信息
                    return {
                        title: item.title,
                        link: item.link,
                    };
                }
            })
        )
    );

    return {
        title: '北极星电力网 - 新闻中心',
        link: 'https://www.bjx.com.cn/',
        item: articleItems,
    };
}
